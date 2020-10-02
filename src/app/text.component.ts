import { Component, forwardRef,  HostBinding,    Input, OnInit } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidatorFn } from '@angular/forms';
import { LabeledField, LabeledFieldOptions } from './labeled-field';

export type FieldTextOptions = {
  type?: 'text' | 'password' | 'email' | 'search';
  autocomplete?: 'on' | 'off' | null;
  // browsers implement input restrictions for these attributes
  maxlength?: string | number;
  morphTo?: string;
} & LabeledFieldOptions;

@Component({
  selector: 'app-text',
  templateUrl: 'text.component.html',
  providers: [
    {provide: LabeledField, useExisting: forwardRef(() => FieldTextComponent)},
    {provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FieldTextComponent), multi: true},
    {provide: NG_VALIDATORS, useExisting: forwardRef(() => FieldTextComponent), multi: true}
  ],
  host: {
    '[attr.ftg]': 'fdp'
  }
})
export class FieldTextComponent extends LabeledField implements FieldTextOptions, OnInit {
  // FYI email input type native browser validation doesn't work in an angular app
  @Input() type: 'text' | 'password' | 'email' | 'search' = 'text';
  @Input() autocomplete: 'on' | 'off' | null;
  @Input('tg') fdp: any;

  _maxlength: string;
  _polyMaxlength: number;
  // FYI polymorph directive takes precedence over ng's DefaultValueAccessor
  polyName: string;
  polyOptions: string;

  // @HostBinding("attr.ftg")
  // get lol() {
  //   return this.fdp;
  // }  
  
  ngOnInit() {
    super.ngOnInit();

    if (this.autocomplete !== 'off' && this.id.startsWith(this.RANDOM_ID_PREFIX)) {
      // if we can't build consistent id (random id is assigned),
      // turn off autocomplete functionality (we could have wrong suggestions)
      this.autocomplete = 'off';
    }

    this.internalControl.setValidators(this.createControlValidators())
  }

  ngOnChanges(changes) {
    super.ngOnChanges(changes);
  }
   
  createControlValidators(): ValidatorFn {
    return c => {
      let {value} =c;
      if (value == null || value === '') {
        return null;
      }
      if (value === 'o') {
        return { field_forbid: true };
      }
      else if (+value <= 2) {
        return { field_short: true }
      }
      return null;
    }
  }

  get maxlength(): string | number {
    return this._maxlength;
  }

  @Input()
  set maxlength(value: string | number) {
    this._maxlength = typeof value == 'number' ? String(value) : value;
  };

  /** format: DirectiveName:polymorphOptions? **/
  @Input()
  set morphTo(value: string) {
    let split = value.split(':')
    this.polyName = split[0];
    this.polyOptions = split[1];
  }

}
