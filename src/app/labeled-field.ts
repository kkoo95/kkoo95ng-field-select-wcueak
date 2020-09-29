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

  internalControl: AbstractControl;
  onTouched: Function;

  protected _options: LabeledFieldOptions;
  protected keyValueDiffers: KeyValueDiffers;
  protected optionsKeyValueDiffer: KeyValueDiffer<string, any>;
  protected cdr: ChangeDetectorRef;
  protected ngControl: NgControl;

  readonly RANDOM_ID_PREFIX: string = 'pi-field-';

  constructor(protected injector: Injector) {
    this.keyValueDiffers = this.injector.get(KeyValueDiffers);
    this.cdr = this.injector.get(ChangeDetectorRef);
  }

  get fc() {
    return this.internalControl as FormControl;
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
    }

    this.internalControl = new LabeledFormControl();

    this.prepareMessages();
  }

  // update outer control's value without marking it as dirty
  protected updateValue(value?: any) {
    if (this.ngControl) {
      this.ngControl.control.setValue(value !== undefined ? value : this.ngControl.value, { emitViewToModelChange: false });
    }
  }

  ngOnDestroy() {
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

  protected safeTranslate(key: string) {
    return '$$'+key;
  }

  protected prepareMessages(): MessageRegistry {
    if (this.userMessages == null) {
      // means user don't want nothing
      return {};
    } else {
      this.userMessages = {
        required: 'Required',
        empty: 'Empty!',
        field_binding: '[field]binding',
        field_exists: '[field]exists',
        ...this.userMessages
      }
      return this.userMessages;  
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

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.internalControl.disable({emitEvent: false}) : this.internalControl.enable({emitEvent: false});
  }

  @HostBinding('class.disabled')
  get disabled() {
    return this.internalControl.disabled;
  }

  protected isRequired() {
    let requiredValidator = this.injector.get(RequiredValidator, null, InjectFlags.Optional);

    if (requiredValidator) {
      return requiredValidator.required as boolean;
    }
    // if reactive form is used instead...
    else if (this.ngControl) {
      const SILENTLY = { emitEvent: false, onlySelf: true, emitModelToViewChange: false, emitViewToModelChange: false };
      const { control } = this.ngControl;

      // ...no other way but assigning temporary null value to verify existence of such validator
      let oldValue = control.value;
      control.setValue(null, SILENTLY);
      control.updateValueAndValidity(SILENTLY);
      let required = control.hasError('required');
      control.setValue(oldValue, SILENTLY);
      control.updateValueAndValidity(SILENTLY);

      return required
    }

    return false;
  }

  /*
  * call stack: outerControlDirective.updateValueAndValidity(opts)
  *  &.setValue(v, opts)
    *  updateControl(control, dir) // markAsDirty
    *  cva.onChange(v) // pendingValue = v
    *
    * ngmodel._updateValuec // async
  */
  validate(_clearChangeFns: AbstractControl) {
    return this.internalControl.errors;
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


@Component({
  selector: 'field-messages',
  template: `
    <div class="error-label" *ngFor="let err of errorMessages">{{err}}</div>
  `
})
export class FieldMessages {
  errorMessages: string[];

  @Input() skip: boolean;
  @Input() userMessages: MessageRegistry = {};

  protected messages: MessageRegistry;
  protected unsub: Subscription;
  
  constructor(@Optional() public ngControl: NgControl) {
  }

  ngOnInit(): void {
    this.unsub = this.ngControl.statusChanges.subscribe(this.refreshErrorMessages.bind(this))

    this.translateMessages();

    if (this.errorMessages == null) { 
      this.refreshErrorMessages();
    } 
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.userMessages && !changes.userMessages.firstChange) {
      this.translateMessages();
    }
    if ((changes.skip && !changes.skip.firstChange)
          || (changes.userMessages && !changes.userMessages.firstChange)) {
      this.refreshErrorMessages();
    }
  }

  protected translateMessages() {
    this.messages = {...this.userMessages};

    Object.keys(this.messages)
      .forEach(k => this.messages[k] = this.safeTranslate(this.messages[k]));
  }

  ngOnDestroy() {
    if (this.ngControl) {
      this.unsub.unsubscribe();
    }
  }

  protected refreshErrorMessages() {
    const { errors } = this.ngControl;
    let messages: string[];

    if (errors == null || this.skip) {
      messages = []
    }
    else {
      messages = Object.keys(errors).map((e, i, arr) => this.messages[e] || arr[i]);
      // messages = Object.keys(this.messages)
      //   .filter(k => ObjectUtils.resolveNested(errors, k) != null)
      //   .map(k => this.messages[k]);
    }

    this.errorMessages = messages;
  };
  
  protected safeTranslate(key: string) {
    return '$'+key;
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