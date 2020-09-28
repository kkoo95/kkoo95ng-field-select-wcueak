import { Directive, forwardRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NG_VALIDATORS, Validator, ValidatorFn, AbstractControl, ValidationErrors } from "@angular/forms";
import { ArrayUtils } from './array-utils';
import { ObjectUtils } from './object-utils';


export abstract class ChangingValidator implements OnChanges, Validator {
  protected validator: ValidatorFn;
  protected onChangeValidator: () => void;

  registerOnValidatorChange(fn: () => void): void {
    this.onChangeValidator = fn;
  }

  ngOnInit(changes: SimpleChanges): void {
    if (this.validator == null) {
      this.renewValidator()
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.renewValidator()
  }

  protected renewValidator() {
    this.validator = this.createValidator();
    if (this.onChangeValidator) this.onChangeValidator();
  }

  validate(control: AbstractControl): ValidationErrors | null {
    return this.validator ? this.validator(control) : null;
  }

  protected abstract createValidator(): ValidatorFn

};


@Directive({
  selector: '[full]',
  providers: [{provide: NG_VALIDATORS, useExisting: forwardRef(() => ExistsValidatorDirective), multi: true}]
})
export class ExistsValidatorDirective<T> extends ChangingValidator implements Validator, OnChanges {

  @Input() mask: any;

  protected createValidator(): ValidatorFn {
    return (control) => {
      let { value } = control;
      if (value != null && typeof value != 'number') {
        return Object.keys(value).length == 0 ? { empty : true } : null;
      }
      if (value <= 2) {
        return { too_low : true };
      }
      return null;
    }
  }

}


@Directive({
  selector: '___app-select',
  providers: [{provide: NG_VALIDATORS, useExisting: forwardRef(() => ExistsValidatorDirective0), multi: true}]
})
export class ExistsValidatorDirective0<T> extends ChangingValidator implements Validator, OnChanges {

  @Input() items: any[];
  @Input() bindValue: string;
  @Input() compareWith: (a: any, b: any) => boolean;
  @Input() multiple: boolean;
  @Input() loading: boolean;

  protected createValidator(): ValidatorFn {
    return (control) => {
      if (this.loading) {
        return {loading: true};       
      }
      else {
        let { value } = control;
        let valueArr = this.multiple || value == null ? value : [value];

        if (valueArr && valueArr.length > 0) {
          let intersection = this.intersectWithItems(valueArr);

          if (intersection?.length != valueArr.length) {
            return {exists: true};
          }
        }
        
        return null;
      }
    }
    // return ArrayUtils.exists(this.items, this.bindValue, this.compareWith)
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
  
  protected getBoundValue(value: any): any {
    return ObjectUtils.resolveNested(value, this.bindValue);
  }

}
