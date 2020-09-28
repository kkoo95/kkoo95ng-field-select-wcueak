import { Component, EventEmitter, Injector, Input, OnChanges, OnInit, Optional, Output, Self, SimpleChanges, TemplateRef } from "@angular/core";
import { NgControl, ValidationErrors } from '@angular/forms';
import { LabeledField, LabeledFieldOptions } from './labeled-field';
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

@Component({
  selector: 'app-select',
  templateUrl: 'select.component.html',
  styleUrls: ['select.component.scss'],
  providers: [
    {provide: LabeledField, useExisting: FieldSelectComponent}
  ]
})
export class FieldSelectComponent extends LabeledField implements OnInit, OnChanges, FieldSelectOptions {
  @Input() items: any[];
  @Input() bindValue: string;
  @Input() bindLabel: string;
  @Input() compareWith: (a: any, b: any) => boolean;
  @Input() multiple = false;
  // @Input() maxSelectedItems: 'none' | number = 'none';
  @Input() clearable: boolean;
  @Input() searchFn: (term: string, item: any) => boolean;
  @Input() autoDefaultValue = true;
  /**
   * ngselect default behavior is somewhat true: it renders empty but models remain unchanged.
   * our default is false, but we are only supporting this on single value selection
   */
  @Input() allowInvalid: boolean;
  @Input() loading = false;
  @Input() confirmChange: (value: any) => boolean | Promise<boolean>;
  @Input() labelTemplate: TemplateRef<any>;
  @Input() optionTemplate: TemplateRef<any>;
  @Input() hideSelected: boolean;
  @Output() clear = new EventEmitter();

  existenceItems: any[] | null;

  constructor(
    @Self() @Optional() public ngControl: NgControl,
    protected injector: Injector
  ) {
    super(ngControl, injector);
  }

  ngOnInit() {
    // do it first to avoid calling internal validators
    let required = this.isRequired();

    super.ngOnInit();

    /* if clearable attribute is not added, set it to true by default in the case that field is not required */
    if (this.clearable === undefined) {
      this.clearable = !required;
    }
    if (this.hideSelected === undefined) {
      this.hideSelected = this.multiple;
    }
  }

  protected setupValidation() {
    super.setupValidation();

    this.fc.setValidators((control) => {
      if (this.loading) {
        return {loading: true};
      }
      return null;
    });

    // leverage status change to possibly force a new value. 
    this.fc.statusChanges.subscribe(_ => {

    })
  }

  protected removePristineErrors(errors: ValidationErrors) {
    super.removePristineErrors(errors);
    delete errors.loading;
  }

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);

    let udpateValididty = false;
    let newValue = undefined;

    if (changes.loading) {
      udpateValididty = true;
    }
    if (['items', 'bindValue', 'compareWith', 'allowInvalid', 'multiple', 'autoDefaultValue'].some(p => p in changes)) {
      if (!this.allowInvalid) {
        if (this.multiple) {
          let current = this.fc.value as any[]
          let intersection = ArrayUtils.intersection(this.items, current, this.getBoundValue.bind(this));

          if (intersection.length != current.length) {
            newValue = this.fc.errors.intersection;
          }
        }      
        else {
          let found = ArrayUtils.findElement(this.items, this.fc.value, this.bindValue, this.compareWith);

          if (found == null) {
            let selectFirst = this.autoDefaultValue && (this.items && this.items.length >= 1);
            newValue = selectFirst ? this.getBoundValue(this.items[0]) : undefined;
          }
        }
      }
    }

    setTimeout(() => {
      if (newValue !== undefined) {
        this.fc.setValue(newValue);
      }
      else if (udpateValididty) {
        this.updateValidityOnly()
      }
    }); 
  }

  protected getBoundValue(value: any): any {
    return ObjectUtils.resolveNested(value, this.bindValue);
  }

  emit<T>(emitterKey: keyof FieldSelectComponent, payload?: T) {
    let emitter = this[emitterKey] as EventEmitter<T>;
    emitter.emit(payload);
  }

}
