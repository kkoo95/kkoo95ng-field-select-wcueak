import { Component, Input } from "@angular/core";
import { ValidatorFn } from "@angular/forms";
import { LabeledField } from "./labeled-field";
import { ObjectUtils } from "./object-utils";

@Component({
  selector: 'field-plain',
  templateUrl: 'plain.component.html',
  providers: [
    {provide: LabeledField, useExisting: FieldPlainTextComponent}
  ]
})
export class FieldPlainTextComponent extends LabeledField {

  @Input()
  public fixedValue: string;
  @Input()
  public bindLabel: string;

  get displayValue() {
    return ObjectUtils.resolveNested(this.fixedValue || this.fc.value, this.bindLabel);
  } 

  writeValue(value: any): void {
    super.writeValue(value);
  }

  createControlValidators(): ValidatorFn {
    return c => {
      if (c.value == null) {
        return null;
      }
      else if (c.value ===0 || (this.bindLabel && !(this.bindLabel in c.value))) {
        return { field_binding: true }
      }
    }
  }

}
