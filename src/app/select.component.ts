import { Component, EventEmitter, Injector, Input, OnChanges, OnInit, Optional, Output, Self, SimpleChanges, TemplateRef } from "@angular/core";
import { NgControl, NG_VALIDATORS,  NG_VALUE_ACCESSOR,    ValidationErrors, ValidatorFn } from '@angular/forms';
import { LabeledField, LabeledFieldOptions, resolvedPromise } from './labeled-field';
import { ArrayUtils } from "./array-utils";
import { ObjectUtils } from "./object-utils";

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
  @Input() multiple;
  @Input() maxSelectedItems: 'none' | number = 'none';
  @Input() clearable: boolean = true;
  @Input() searchFn: (term: string, item: any) => boolean;
  /**
   * If true, when field value cannot be found in items, no attempt will be made to still pick a value from them.
   * When false, the first item, if available, will be selected. Defaults to required state
   */
  @Input() allowInvalid: boolean;
  /**
   * If true (default) and items only contains one item, the value will be automatically changed to that one.
   */
  @Input() autoDefaultValue = true;
  @Input() loading;
  @Input() confirmChange: (value: any) => boolean | Promise<boolean>;
  @Input() labelTemplate: TemplateRef<any>;
  @Input() optionTemplate: TemplateRef<any>;
  @Input() hideSelected: boolean;
  @Output() clear = new EventEmitter();

  // helps turning one loading state at initialisation if no explicit loading value is provided
  protected initializing = true;
  _forcedLoading = false;

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
    if (this.allowInvalid === undefined) {
      this.allowInvalid = !required;
    }

    this.setupControlValidators();

    this.initializing = false;
  }

  setupControlValidators() {
    this.internalControl.setValidators(control => {
      if (this.loading) {
        return { loading: true };
      }
      else {
        let { value } = control;
        let valueArr = this.multiple || value == null ? value : [value];

        if (valueArr && valueArr.length > 0) {
          let intersection = this.intersectWithItems(valueArr);
          if (intersection?.length != valueArr.length) {
            return { field_exists: true };
          }
        }
        return null;
      }
    })
  }

  protected handleErrorState() {
    // need to syncronize this handler installation with next cycle like in onChangeInputs
    // resolvedPromise.then(() => {
      super.handleErrorState();
    // })
  }

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);

    if (['loading', 'items', 'bindValue', 'compareWith', 'allowInvalid', 'multiple', 'autoDefaultValue'].some(p => p in changes)) {
      let forceLoadingAtInit = this.shouldForceLoadingAtInit();
      let newLoadingStatus = this.loading;
      let validityChanged = Boolean(changes.loading?.previousValue) != Boolean(changes.loading?.currentValue);

      if (forceLoadingAtInit) {
        this._forcedLoading = true;
        newLoadingStatus = true;
        validityChanged = true;
      }
      else if (this._forcedLoading) {
        this._forcedLoading = false;
        newLoadingStatus = false;
        validityChanged = true;
      }
      if (validityChanged) {
        this.loading = newLoadingStatus;
      }

      if (!this.initializing) {
        let newValue = this.figureNewValue(newLoadingStatus);
        let valueChanged = newValue !== this.fc.value

        if (validityChanged || valueChanged) {
          this.onChangeInputs(newValue);
        }
      }
    }
  }

  protected onChangeInputs(newValue: any) {
    // must saved component state to reuse during next cycle
    let validationDataClosure = this.getValidationData(this);

    // forcing an additional change detection run when inputs have effective impacts on selected value or
    // loading status to avoid ECAIHBCError
    resolvedPromise.then(() => {
      let savedValidationData = this.getValidationData(this);

      this.applyValidationData(validationDataClosure, this);
      this.updateControl(newValue !== this.fc.value ? newValue : undefined);
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

  protected getValidationData({ items, bindValue, compareWith, multiple, loading, _forcedLoading  }: FieldSelectComponent): Partial<FieldSelectComponent> {
    return { items, bindValue, compareWith, multiple, loading, _forcedLoading  }
  }

  protected applyValidationData(data: Partial<FieldSelectComponent>, target: any) {
    let keys: FieldSelectOptionKeys[] = ['items', 'bindValue', 'compareWith', 'multiple', 'loading', '_forcedLoading']
    keys.forEach((k: string) => target[k] = data[k]);
  }

  // Trying to be nice here by forcing loading status if it hasn't been explicitly set at init and also items
  // are not there yet. This is to avoid unexpected rendering at init
  protected shouldForceLoadingAtInit() {
    let force = false;
    if (this.initializing && this.loading === undefined) {
      force = !this.items || (this.items.length == 0 && this.isRequired());
    }
    return force;
  }

  protected getDisplayErrors() {
    let err = super.getDisplayErrors();
    // ignore loading error messages (if any)
    delete err.loading;
    return err;
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