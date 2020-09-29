import { Component, EventEmitter, Injector, Input, OnChanges, OnInit, Optional, Output, Self, SimpleChanges, TemplateRef } from "@angular/core";
import { NgControl, NG_VALIDATORS,  NG_VALUE_ACCESSOR,    ValidationErrors, ValidatorFn } from '@angular/forms';
import { LabeledField, LabeledFieldOptions } from './labeled-field';
import { ArrayUtils } from "./array-utils";
import { ObjectUtils } from "./object-utils";

const resolvedPromise = Promise.resolve();

export type FieldSelectOptions = {
  items?: any[];
  bindValue?: string;
  bindLabel?: string;
  compareWith?: (a: any, b: any) => boolean;
  multiple?: boolean;
  // maxSelectedItems?: 'none' | number;
  clearable?: boolean;
  autoDefaultValue?: boolean;
  allowInvalid?: boolean;
  loading?: boolean;
  confirmChange?: (value: any) => boolean | Promise<boolean>;
} & LabeledFieldOptions;

type FieldSelectOptionKeys = keyof FieldSelectComponent;

@Component({
  selector: 'app-select',
  templateUrl: 'select.component.html',
  styleUrls: ['select.component.scss'],
  providers: [
    {provide: LabeledField, useExisting: FieldSelectComponent},
    {provide: NG_VALUE_ACCESSOR, useExisting: FieldSelectComponent, multi: true},
    {provide: NG_VALIDATORS, useExisting: FieldSelectComponent, multi: true}
  ]
})
export class FieldSelectComponent extends LabeledField implements OnInit, OnChanges, FieldSelectOptions {
  @Input() items: any[];
  @Input() bindValue: string;
  @Input() bindLabel: string;
  @Input() compareWith: (a: any, b: any) => boolean;
  @Input() multiple = false;
  // @Input() maxSelectedItems: 'none' | number = 'none';
  @Input() clearable: boolean = true;
  @Input() searchFn: (term: string, item: any) => boolean;
  @Input() autoDefaultValue = false;
  /**
   * ngselect default behavior is somewhat true: it renders empty but models remain unchanged.
   * our default is false, but we are only supporting this on single value selection
   */
  @Input() allowInvalid: boolean = false;
  @Input() loading;
  @Input() confirmChange: (value: any) => boolean | Promise<boolean>;
  @Input() labelTemplate: TemplateRef<any>;
  @Input() optionTemplate: TemplateRef<any>;
  @Input() hideSelected: boolean;
  @Output() clear = new EventEmitter();

  // helps turning one loading state at initialisation if no explicit loading value is provided
  _forceLoading: boolean;

  ngOnInit() {
    super.ngOnInit();

    const required = this.isRequired();

    // if clearable attribute is not added, set it to true by default in the case that field is not required
    if (this.clearable === undefined) {
      this.clearable = !required;
    }
    if (this.hideSelected === undefined) {
      this.hideSelected = this.multiple;
    }

    this.setupControlValidators();

    // trying to be nice here by forcing loading status if it hasn't been explicitly set and items are not there yet.
    // this is to avoid unexpected rendering at init
    let forcedLoadingStatus = this.loading === true
      || (this.loading !== false && (!this.items || (this.items.length == 0 && required)))

    this.onChangeInputs(forcedLoadingStatus);
  }

  setupControlValidators() {
    this.internalControl.setValidators(control => {
      if (this.loading || this._forceLoading) {
        return {loading: true};
      }
      else {
        let { value } = control;
        let valueArr = this.multiple || value == null ? value : [value];

        if (valueArr && valueArr.length > 0) {
          let intersection = this.intersectWithItems(valueArr);
          if (intersection?.length != valueArr.length) {
            return {field_exists: true};
          }
        }
        return null;
      }
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    let isFirstChangeEver =  changes.label?.firstChange || changes.items?.firstChange || changes.bindValue?.firstChange;

    // first change is handled in init method
    if (!isFirstChangeEver) {
      if (['loading', 'items', 'bindValue', 'compareWith', 'allowInvalid', 'multiple', 'autoDefaultValue'].some(p => p in changes)) {
        let updateValidity = ('loading' in changes) || this._forceLoading;
        let newLoadingStatus = this._forceLoading ? false : this.loading;
        let newValue = this.figureNewValue(newLoadingStatus);
        let sameValue = newValue === this.fc.value

        if (!sameValue || updateValidity) {
          this.onChangeInputs(newLoadingStatus, sameValue ? undefined : newValue);
        }
      }
    }
  }

  protected onChangeInputs(newLoadingStatus: boolean, newValue?: any) {
    this.loading = this._forceLoading = newLoadingStatus;

    // must saved component state to reuse it the next cycle  
    let validationClosure = this.getValidationData(this);

    //  forcing an additional change detection run when inputs have effective impacts on selected value or loading status
    resolvedPromise.then(() => {
      let savedValidationData = this.getValidationData(this);

      this.applyValidationData(validationClosure, this);
      this.updateValue(newValue);
      this.applyValidationData(savedValidationData, this);
    });
  }

  protected figureNewValue(loading: boolean) {
    let newValue = this.fc.value;

    if (!loading) {
      let value = newValue;
      let valueArr = this.multiple && value == null ? value : [value];
      let intersection = this.onlyValid ? this.intersectWithItems(valueArr) : valueArr;
      let emptyIntersect = !intersection || intersection.length == 0;
      let trySelectFirst = (emptyIntersect && valueArr != null) || (this.autoDefaultValue && (this.items?.length == 1));

      if (trySelectFirst) {
        let firstValue = this.getBoundValue(this.items ? this.items[0] : undefined);

        if (firstValue === undefined) {
          newValue = this.onlyValid ? null : undefined;
        }
        else if (firstValue != null && !ArrayUtils.findElement(valueArr, firstValue, this.bindValue, this.compareWith)) {
          if (this.multiple) {
            newValue = emptyIntersect ? [firstValue] : intersection.concat(firstValue);
          } else {
            newValue = firstValue;
          }
        }
      } else if (valueArr && intersection?.length != valueArr.length) {
        newValue = intersection;
      }
    }

    return newValue;
  }

  protected intersectWithItems(arr: any[]): any[] {
    if (this.compareWith) {
      return ArrayUtils.intersection(this.items, arr, this.compareWith);
    }
    else {
      let boundItems = this.items == null ? null : this.items.map(e => this.getBoundValue(e))
      return ArrayUtils.intersection(boundItems, arr);
   }
  }

  protected getValidationData({ items, bindValue, compareWith, multiple, loading, _forceLoading }: FieldSelectComponent): Partial<FieldSelectComponent> {
    return { items, bindValue, compareWith, multiple, loading, _forceLoading }
  }

  protected applyValidationData(data: Partial<FieldSelectComponent>, target: any) {
    let keys: FieldSelectOptionKeys[] = ['items', 'bindValue', 'compareWith', 'multiple', 'loading', '_forceLoading']
    keys.forEach((k: string) => target[k] = data[k]);
  }

  protected getBoundValue(value: any): any {
    return ObjectUtils.resolveNested(value, this.bindValue);
  }

  emit<T>(emitterKey: keyof FieldSelectComponent, payload?: T) {
    let emitter = this[emitterKey] as EventEmitter<T>;
    emitter.emit(payload);
  }

  protected get onlyValid() {
    return !this.allowInvalid;
  }
}