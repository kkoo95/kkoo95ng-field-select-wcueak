import { Component, Input, Optional, SimpleChanges } from '@angular/core';
import { NgControl, ValidationErrors } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageRegistry } from './labeled-field';
import { ObjectUtils } from './object-utils';

function coerceToString(entry: string | (() => string)) {
  return typeof entry == "string" ? entry : entry();
}

@Component({
  selector: 'field-messages',
  template: `
    <div class="error-label" *ngFor="let err of errorMessages">{{err}}</div>
  `
})
export class LabeledFieldMessagesComponent {
  @Input() errors: ValidationErrors;
  @Input() messages: MessageRegistry;
  @Input() skip: boolean;

  errorMessages: string[];

  protected translatedMessages: { [x: string]: string };

  constructor() {
  }

  ngOnInit(): void {
    this.translateMessages();

    if (this.errorMessages == null) {
      this.refreshErrorMessages();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.messages && !changes.messages.firstChange) {
      this.translateMessages();
    }
    if ((changes.errors && !changes.errors.firstChange)
      || (changes.messages && !changes.messages.firstChange)
      || (changes.skip && !changes.skip.firstChange)) {
      this.refreshErrorMessages();
    }
  }

  protected translateMessages() {
    this.translatedMessages = {};

    if (this.messages) {
      Object.entries(this.messages)
        .forEach(([errKey, mgsKey]) => this.translatedMessages[errKey] = this.safeTranslate(coerceToString(mgsKey)));
    }
  }

  protected refreshErrorMessages() {
    let messages: string[];

    if (this.errors == null || this.skip) {
      messages = []
    }
    else {
      messages = Object.keys(this.translatedMessages)
        .filter(k => ObjectUtils.resolveNested(this.errors, k) != null)
        .map(k => this.translatedMessages[k]);
      messages = Object.keys(this.errors).map(k => this.translatedMessages[k]);
    }

    this.errorMessages = messages;
  };

  protected safeTranslate(key: string) {
    return key;
  }

}
