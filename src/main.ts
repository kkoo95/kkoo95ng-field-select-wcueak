import './polyfills';

import { enableProdMode } from '@angular/core';
// import jasmineRequire from 'jasmine-core/lib/jasmine-core/jasmine.js';

// window['jasmineRequire'] = jasmineRequire;

// import 'jasmine-core/lib/jasmine-core/jasmine-html.js';
// import 'jasmine-core/lib/jasmine-core/boot.js';

declare var jasmine;

// import './test.ts'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule).then(ref => {
  // Ensure Angular destroys itself on hot reloads.
  if (window['ngRef']) {
    window['ngRef'].destroy();
  }
  window['ngRef'] = ref;

  // Otherwise, log the boot error
}).catch(err => console.error(err));

function bootstrap () {
  if (window['jasmineRef']) {
    location.reload();

    return;
  }

  window.onload(new Event('anything'));
  window['jasmineRef'] = jasmine.getEnv();
};
