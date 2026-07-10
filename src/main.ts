import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { logError } from './app/core/logging/app-logger';

bootstrapApplication(App, appConfig)
  .catch((error) => logError('application.bootstrap', error));
