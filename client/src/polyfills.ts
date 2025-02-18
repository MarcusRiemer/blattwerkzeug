/***************************************************************************************************
 * Load `$localize` onto the global scope - used if i18n tags appear in Angular templates.
 */
import "@angular/localize/init";
/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes Safari >= 10, Chrome >= 55 (including Opera),
 * Edge >= 13 on the desktop, and iOS 10 and Chrome on mobile.
 *
 * Learn more in https://angular.io/guide/browser-support
 */

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/** Evergreen browsers require these. **/
import "core-js/es/reflect";

/***************************************************************************************************
 * Zone JS is required by Angular itself.
 */
import "zone.js"; // Included with Angular CLI.

/***************************************************************************************************
 * APPLICATION IMPORTS
 */

import "core-js/es/object";

// Add global to window, assigning the value of window itself.
// This hack is currently required for ACE, see https://github.com/fxmontigny/ng2-ace-editor/issues/87
(window as any).global = window;

/**
 * Date, currency, decimal and percent pipes.
 * Needed for: All but Chrome, Firefox, Edge, IE11 and Safari 10
 */
// import 'intl';  // Run `npm install --save intl`.
