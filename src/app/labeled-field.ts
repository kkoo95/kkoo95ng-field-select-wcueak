import {
  ChangeDetectorRef,
  Component,
  ContentChild,
  Directive,
  DoCheck, EventEmitter,
  HostBinding,
  InjectFlags,
  Injector,
  Input,
  KeyValueDiffer,
  KeyValueDiffers,
  OnChanges,
  OnInit,
  Optional,
  Self,
  SimpleChange,
  SimpleChanges,
  TemplateRef,
Inject,
forwardRef,
isDevMode
} from '@angular/core';
import { ControlValueAccessor, FormControl, RequiredValidator, ValidationErrors, Validators, ValidatorFn, AbstractControl, NG_VALIDATORS, NgControl } from "@angular/forms";
import { Subscription } from 'rxjs';
import { ObjectUtils } from "./object-utils";

export const DEBUG_FIELD_ERRORS = isDevMode() && true;

export type ValidationResult = null | any;
export type ValidationResultFn = (control: AbstractControl) => ValidationResult;
export type PiControlValidators = { [x: string]: ValidationResult | ValidationResultFn } | ValidatorFn | ValidatorFn[];
 
export const resolvedPromise = Promise.resolve();

@Directive({selector: 'ng-template[piFieldLabel]'})
export class LabeledFieldLabel {
  constructor(public templateRef: TemplateRef<any>) {}
}

let uid = 0; 

export type MessageRegistry = { [x: string]: string };

export type NgClassType = string | string[] | Set<string> | {
  [klass: string]: any;
};

export type FieldsStyle = { [x: string]: NgClassType };

/**
 * Reflects all available inputs of a LabeledFieldOptions
 */
export type LabeledFieldOptions = {
  label?: string;
  placeholder?: string,
  readonly?: boolean;
  autofocus?: 'on' | 'off' | null,
  classes?: FieldsStyle,
  messages?: MessageRegistry,
  validators?: PiControlValidators,
  id?: string
}

class LabeledFormControl extends FormControl { id:any }

@Directive()
export abstract class LabeledField implements ControlValueAccessor, OnInit, OnChanges, DoCheck, LabeledFieldOptions {

  @Input() label: string;
  @Input() placeholder: string = '';
  @Input() readonly: boolean;
  @Input() autofocus: 'on' | 'off' | null = null;
  @Input() classes: FieldsStyle = {};
  @Input('messages') userMessages: MessageRegistry = {};
  @Input() validators: PiControlValidators;
  @Input() id: string;

  @HostBinding('class.labeled-field') topClass = true;
  @ContentChild(LabeledFieldLabel) labelTpl: LabeledFieldLabel;

  internalControl: AbstractControl = new LabeledFormControl();
  displayErrors: ValidationErrors;
  messages: MessageRegistry;
  onTouched: Function;

  protected _options: LabeledFieldOptions;
  protected keyValueDiffers: KeyValueDiffers;
  protected optionsKeyValueDiffer: KeyValueDiffer<string, any>;
  protected cdr: ChangeDetectorRef;
  protected ngControl: NgControl;
  protected unsub = new Subscription();
  protected defaultMessages: MessageRegistry = {
    required: 'Required',
    empty: 'Empty!',
    field_binding: '[field]binding',
    field_exists: '[field]exists',
  }

  readonly RANDOM_ID_PREFIX: string = 'pi-field-';

  constructor(protected injector: Injector) {
    this.keyValueDiffers = this.injector.get(KeyValueDiffers);
    this.cdr = this.injector.get(ChangeDetectorRef);
  }

  @Input()
  set options(options: LabeledFieldOptions) {
    this.optionsKeyValueDiffer = null;
    this._options = options;

    if (this._options) {
      this.optionsKeyValueDiffer = this.keyValueDiffers.find(this._options).create();
    }
  }

  ngOnInit(): void {
    this.ngControl = this.injector.get(NgControl, null, InjectFlags.SkipSelf | InjectFlags.Optional);

    if (this.ngControl) {
      /* Try to assign same id each time field is initialized
         in order to have correct autocomplete suggestions */
      if (!this.id && this.ngControl.name) {
        this.id = String(this.ngControl.name);
      } else if(!this.id) {
        this.id = this.RANDOM_ID_PREFIX + ++uid;
      }
      this.internalControl['__debug'] = this.id;
      this.handleErrorState();
    }

    this.prepareMessages();
  }

  ngOnDestroy() {
    this.unsub.unsubscribe();

    if (this.ngControl) {
      // there is a memory leak when combining formControl and ngIf: CVA is not unlinked properly when directive is destroyed.
      // see https://github.com/angular/angular/pull/37566
      // TODO(jar) wait patiently for upgrade to v10.1+
      cleanUpControl(this.ngControl.control, this.ngControl)
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.label) {
      this.label = this.safeTranslate(this.label);
    }
    if (changes.placeholder) {
      this.placeholder = this.safeTranslate(this.placeholder);
    }
    if (changes.userMessages && !changes.userMessages.isFirstChange()) {
      this.prepareMessages()
    }
  }

  ngDoCheck(): void {
    if (this.optionsKeyValueDiffer) {
      let diff = this.optionsKeyValueDiffer.diff(this._options);
      let changes: SimpleChanges = {};

      if (diff) {
        diff.forEachItem(record => {
          this[record.key] = record.currentValue;
          changes[record.key] = new SimpleChange(record.previousValue, record.currentValue, false);
        });
        this.ngOnChanges(changes);
        this.cdr.markForCheck();
      }
    }
  }

  protected prepareMessages() {
    if (this.userMessages === null) {
      // if and only if null, it means user don't want nothing
      this.messages = {};
    } else {
      this.messages = {
        ...this.defaultMessages,
        ...this.userMessages
      }
    }
  }

  registerOnChange(fn: (v:any) => void): void {
    this.internalControl.valueChanges.subscribe(v => fn(v));
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: any): void {
    // emitEvent:true makes outer control dirty (because fired right back up through OnChange handler).
    // we don't want that here, especially at init)
    this.internalControl.setValue(value, {emitEvent: false});
  }

  // covering the case where field is already invalid at init:
  // 1. must tweak dirty state to let our css do its job (red border)
  // 2. empty error messages
  protected handleErrorState() {
    const refreshErrorState = () => {
      this.displayErrors = this.getDisplayErrors();
/*
      // known bug: 2 calls to ngControl.control.setValue() (meaning not from UI) need to be made in order
      // to actually display error messages
      if (this.ngControl.control.pristine && ObjectUtils.isNotEmpty(this.displayErrors)) {
        // remove errors we don't want there messages being displayed at init
        this.displayErrors = {};
        // our CSS requires a dirty state to display error indicator.
        this.ngControl.control.markAsDirty({onlySelf: true});
      }
     */

      if (this.ngControl.control.pristine) {
        // remove errors we don't want there messages being displayed at init
        delete this.displayErrors.required

        if (ObjectUtils.isNotEmpty(this.displayErrors)) {
          this.displayErrors = {};
          // our CSS requires a dirty state to display error indicator.
          this.ngControl.control.markAsDirty({onlySelf: true});
        }
      }

      // if (this.ngControl.control.pristine) {
      //   // remove errors we don't want there messages being displayed at init
      //   this.displayErrors = {};
      //   this.ngControl.control.markAsDirty({onlySelf: true});
      // }
    }
    const subscribe = () => {
      this.unsub.add(this.ngControl.statusChanges.subscribe(refreshErrorState))
    }

    // this is the case when ngControl is a FormControlName
    if (!this.ngControl.statusChanges) {
      resolvedPromise.then(() => {
        subscribe();
        // since we waited for next cycle, we missed the initial state refresh
        refreshErrorState();
      })
    }
    else {
      subscribe();
    }
  }

  protected getDisplayErrors() {
    return {...this.ngControl.errors};
  }

  /** updates outer control's value and/or status without marking it as dirty **/
  protected updateControl(value: any) {
    if (this.ngControl) {
      const { control } = this.ngControl;

      if (value == undefined) {
        // just refresh status of outer control...
        let ctrl = this.internalControl;
        // ... but refresh local errors first because that's how our validate() works
        let internalErrors = ctrl.validator ? ctrl.validator(ctrl) : null;
        this.internalControl.setErrors(internalErrors);
        let errors = control.validator ? control.validator(control) : null;
        control.setErrors(errors);
      }
      else {
        control.setValue(value, { emitViewToModelChange: false });
      }
    }
  }

  setDisabledState(isDisabled: boolean): void {
    this.internalControl[isDisabled ? 'disable' : 'enable'].call(this.internalControl,  {emitEvent: false});
  }

  @HostBinding('class.disabled')
  get disabled() {
    return this.internalControl.disabled;
  }

  protected isRequired() {
    let requiredValidator = this.injector.get(RequiredValidator, null, InjectFlags.Optional);

    // ngModel + required case
    if (requiredValidator) {
      return requiredValidator.required as boolean;
    }
    // if reactive form is used instead...
    else if (this.ngControl) {
      return new FormControl(null, this.ngControl.validator).hasError('required');
    }

    return false;
  }

  /*
  * call stack: outerControlDirective.updateValueAndValidity(opts)
  *  &.setValue(v, opts)
  *   - updateControl(control, dir) // markAsDirty
  *   - cva.onChange(v) // pendingValue = v
  *
  *   - ngmodel._updateValuec // async
  */
  validate(_clearChangeFns: AbstractControl) {
    return this.internalControl.errors;
  }

  protected safeTranslate(key: string) {
    return key;
  }

  get fc() {
    return this.internalControl as FormControl;
  }
}

@Component({
  selector: 'piTemplatedFieldLabel',
  template: `
    <label class="pi-control-label" *ngIf="hasLabel()" [htmlFor]="owner.id" [ngClass]="owner.classes.label">
      <span [outerHTML]="owner.label"></span><ng-content *ngTemplateOutlet="owner.labelTpl?.templateRef"></ng-content>
    </label>
  `
})
export class TemplatedFieldLabel {
  constructor(public owner: LabeledField) { }

  hasLabel() {
    return this.owner.label != null || this.owner.labelTpl != null;
  }
}



function cleanUpControl(control /* FormControl */, dir/* NgControl*/) {
  function _noControlError(dir) {
    if (isDevMode()) {
      console.debug('There is no FormControl instance attached to form control element with name ' + dir.name)
    }
  }

  dir.valueAccessor.registerOnChange(() => _noControlError(dir));
  dir.valueAccessor.registerOnTouched(() => _noControlError(dir));

  dir._rawValidators.forEach((validator) => {
    if (validator.registerOnValidatorChange) {
      validator.registerOnValidatorChange(null);
    }
  });

  dir._rawAsyncValidators.forEach((validator) => {
    if (validator.registerOnValidatorChange) {
      validator.registerOnValidatorChange(null);
    }
  });

  if ('_clearChangeFns' in control) {
    control._clearChangeFns();
  }
}