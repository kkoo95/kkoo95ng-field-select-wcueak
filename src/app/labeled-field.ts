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
import { ControlValueAccessor, FormControl, NgControl, RequiredValidator, ValidationErrors, Validators, ValidatorFn, AbstractControl } from "@angular/forms";
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
  errorMessages: string[];
  messages: MessageRegistry;

  onTouched: Function;
  protected _options: LabeledFieldOptions;
  protected keyValueDiffers: KeyValueDiffers;
  protected optionsKeyValueDiffer: KeyValueDiffer<string, any>;
  protected cdr: ChangeDetectorRef;
  protected requiredValidator: RequiredValidator;
  protected skipRefreshErrorDisplay = false;

  readonly RANDOM_ID_PREFIX: string = 'pi-field-';

  constructor(@Self() @Optional() public ngControl: NgControl,
              protected injector: Injector) {
    this.keyValueDiffers = this.injector.get(KeyValueDiffers);
    this.cdr = this.injector.get(ChangeDetectorRef);
    this.requiredValidator = this.injector.get(RequiredValidator, null, InjectFlags.Optional);

    if (this.ngControl) {
      // Note: we provide the value accessor through here, instead of
      // the `providers` to avoid running into a circular import.
      this.ngControl.valueAccessor = this;
    }
    
    // must create control validators at construction time to not miss first writeValue validation
    this.internalControl = this.createFormControl();
  }

  createFormControl() {
    return new LabeledFormControl(null, this.createControlValidators());
  }

  createControlValidators(): ValidatorFn | ValidatorFn[] {
    return null
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
    this.translateMessages();

    if (this.ngControl) {
      /* Try to assign same id each time field is initialized
         in order to have correct autocomplete suggestions */
      if (!this.id && this.ngControl.name) {
        this.id = String(this.ngControl.name);
      } else if(!this.id) {
        this.id = this.RANDOM_ID_PREFIX + ++uid;
      }
    }
 
    this.setupValidation();
  }

  unsub: Subscription;
  protected setupValidation() {
    let tryRefresh = () => {
      if (!this.skipRefreshErrorDisplay) {
        this.refreshErrorDisplay()
      }
    };

    this.unsub = this.ngControl.statusChanges.subscribe(tryRefresh)
    this.watchOuterValidator();
    tryRefresh();
  }

  protected refreshErrorDisplay() {
    this.errorMessages = null;

    let errors = this.getActualErrors(); 

    // covering the case where field is already invalid at init. must tweak dirty state to let our css do its job
    if (errors) {
      if (this.ngControl.control.pristine) {
        // remove errors we don't want there messages being displayed at init
        this.removePristineErrors(errors)
      }

      if (ObjectUtils.isNotEmpty(errors)) {
        // our CSS requires a dirty state to display error indicator.
        this.ngControl.control.markAsDirty({onlySelf: true});
      }
    }

    this.errorMessages = this.buildErrorMessages(errors);
  }

  protected getActualErrors() {
    return this.ngControl.errors || this.internalControl.errors 
      ? {...this.ngControl.errors, ...this.internalControl.errors}
      : null;
  }

  protected isActuallyInvalid() {
    let actualErrors = this.getActualErrors();
    return actualErrors ? Object.keys(actualErrors).length > 0 : false;
  }

  protected removePristineErrors(errors: ValidationErrors) {
    delete errors.required;
  }

  /**
   * Acts like FormControl updateValueAndValidity where the value part can be skept if no value is provided.
   * Also capable of not marking the field as dirty.
   */
  protected updateControl(value: any, markAsDirty = true) {
    let wasPristine = this.ngControl.pristine;

    // we may skip the message part because it is based partly on pristine state. we'll have another (manual) shot bellow
    this.skipRefreshErrorDisplay = !markAsDirty;
    // any of these calls will call outer control validators and reset its status; and also cva watchers which will mark it as dirty...
    if (value !== undefined) {
      this.internalControl.setValue(value);
    }
    // udpate validity only ()
    else if (this.internalControl.validator) {
      this.internalControl.setErrors(this.internalControl.validator(this.internalControl));
    }

    this.skipRefreshErrorDisplay = false;

    if (!markAsDirty) {
      if (wasPristine) {
        this.ngControl.control.markAsPristine({onlySelf: true});
      }
      this.refreshErrorDisplay();
    }
  }

  /* since we can't provide ourself as NG_VALIDATOR we must have a way to still validate outer control by passing local errors to it */
  protected watchOuterValidator() {
    // this.overrideSetValidators();
  }

  protected overrideSetValidators() {
    const { control } = this.ngControl;
    const localErrors = _ => {
      let outerError = control.errors;
      return this.internalControl.errors
    };

    const _super = control['_super'] = {
      setValidators: control.setValidators,
      validator: control.validator
    }

    // hacky stuff: proxifying setValidators because not enough API to watch modification
    control.setValidators = new Proxy(control.setValidators, {
      apply: (target, $this, args) => {
        // call real method to coerce validators
        target.apply($this, args);
        _super.validator = control.validator;
        // everytime control's validator is changing, we must recompose it with local errors for proper invalidation
        return target.call($this, Validators.compose([control.validator, localErrors]))
      }
    });
   
    control.setValidators(control.validator);
  }

  protected removeOverrideSetValidators() {
    const { control } = this.ngControl;
    const { _super } = control as any;

    // turn off hacky stuff
    control.setValidators = _super.setValidators;
    control.setValidators(_super.validators);

    delete control['_super'];
  }

  ngOnDestroy() {
    if (this.ngControl) {
      this.unsub.unsubscribe();
      // this.removeOverrideSetValidators();

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
      this.translateMessages();
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
    return '$'+key;
  }

  protected prepareMessages(): MessageRegistry {
    if (this.userMessages == null) {
      // means user don't want nothing
      return {};
    } else {
      this.userMessages = {
        required: 'MANAGER.TUNNEL.COMMON.PERSON-FORM.MSG.MANDATORY-FIELD',
        empty: 'EMPTY!',
        field_binding: '[f] binding',
        field_exists: '[f] exists',
        ...this.userMessages
      }
      return this.userMessages;
    }
  }

  protected translateMessages() {
    this.messages = this.prepareMessages();

    Object.keys(this.messages)
      .forEach(k => this.messages[k] = this.safeTranslate(this.messages[k]));
  }

  onChanged;
  registerOnChange(fn: any): void {
    this.onChanged = fn;
    this.internalControl.valueChanges.subscribe(v => fn(v));
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  writeValue(value: any): void {
    this.internalControl.setValue(value);
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.internalControl.disable({emitEvent: false}) : this.internalControl.enable({emitEvent: false});
  }

  protected buildErrorMessages(errors: {}): string[] {
    if (errors == null) {
      return [];
    }
    return Object.keys(errors).map((e, i, arr) => this.messages[e] || arr[i]);
    return Object.keys(this.messages)
      .filter(k => ObjectUtils.resolveNested(errors, k) != null)
      .map(k => this.messages[k]);
  };

  @HostBinding('class.disabled')
  get disabled() {
    return this.internalControl.disabled;
  }

  protected isRequired() {
    if (this.requiredValidator) {
      return this.requiredValidator.required as boolean;
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