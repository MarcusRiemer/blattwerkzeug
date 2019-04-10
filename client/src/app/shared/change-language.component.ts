import { Component, Inject, LOCALE_ID } from '@angular/core';

import { environment } from './../../environments/environment';
/**
 * @return The unicode string that represents a flag for the given locale
 */
function localeToFlag(locale: string): string {
  switch (locale) {
    case "de": return ("🇩🇪");
    case "en": return ("🇬🇧");
    default: return ("🏳");
  }
}

// TODO: Use `canonicalHost` from environment
// TODO: Use protocol relative URL (`//`), do *not* write "http" or "https"
export const locales = [
  {token: 'de', name: 'Deutsch' ,subdomain: '//de.' + environment.canonicalHost, flag: localeToFlag('de')},
  {token: 'en', name: 'English', subdomain: '//en.' + environment.canonicalHost, flag: localeToFlag('en')},
]

@Component({
  selector: 'natural-language-selector',
  templateUrl: './templates/change-language.html'
})
export class ChangeLanguageComponent {
  // The actual locale that is currently in use
  readonly locale = this._localeId;

  readonly locales = locales;

  // The unicode flag for the current locale
  readonly localeFlag = localeToFlag(this.locale);

  constructor(
    @Inject(LOCALE_ID) private readonly _localeId: string,
  ) { }

  /**
   * Changes the natural language of the application.
   *
   * @param locale The locale to change to, should probably be "de" or "en"
   */
  public changeLanguage(locale: string) {
    // extract "main" domain: blattwerkzeug.tld
    const upperDomain = location.hostname.split('.').slice(-2).join('.');

    // The production domain already ends in ".de", so there is no reason to repeat that
    const newDomain = locale === "de" ? upperDomain : locale + "." + upperDomain;

    // Replace previous domain with new domain
    const newUrl = location.href.replace(location.hostname, newDomain);

    // And navigate there
    document.location.href = newUrl;
  }
}
