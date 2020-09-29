import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { FieldSelectComponent } from './select.component';
import { FieldMessages, LabeledFieldLabel, TemplatedFieldLabel } from './labeled-field';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExistsValidatorDirective } from './exists-validator.directive';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { HttpClientModule } from '@angular/common/http';
import { FieldPlainTextComponent } from './plain.component';
import { FieldTextComponent } from './text.component';
import { FormControlErrorClassesDirective } from './control-errors.directive';

@NgModule({
  imports:      [ BrowserModule, FormsModule, ReactiveFormsModule, NgSelectModule, NgOptionHighlightModule, HttpClientModule ],
  declarations: [ AppComponent, FieldSelectComponent, TemplatedFieldLabel, LabeledFieldLabel, ExistsValidatorDirective, FieldPlainTextComponent, FieldMessages, FieldTextComponent, FormControlErrorClassesDirective ],
  bootstrap:    [ AppComponent ]
})
export class AppModule { }
