import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { FieldSelectComponent } from './select.component';
import { LabeledFieldLabel, TemplatedFieldLabel } from './labeled-field';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExistsValidatorDirective } from './exists-validator.directive';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { HttpClientModule } from '@angular/common/http';
import { FieldPlainTextComponent } from './plain.component';
import { FieldTextComponent } from './text.component';
import { FormControlErrorClassesDirective } from './control-errors.directive';
import { LabeledFieldMessagesComponent } from './field-messages.component';

@NgModule({
  imports:      [ BrowserModule, FormsModule, ReactiveFormsModule, NgSelectModule, NgOptionHighlightModule, HttpClientModule ],
  declarations: [ AppComponent, FieldSelectComponent, TemplatedFieldLabel, LabeledFieldLabel, ExistsValidatorDirective, FieldPlainTextComponent, FieldTextComponent, FormControlErrorClassesDirective, LabeledFieldMessagesComponent ],
  bootstrap:    [ AppComponent ]
})
export class AppModule { }
