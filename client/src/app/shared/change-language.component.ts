import { Component, Inject, LOCALE_ID } from '@angular/core';

import { environment } from './../../environments/environment';
import { NaturalLanguagesService } from '../natural-languages.service';

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

export const locales = environment.availableLanguages.map(l => {
  return (Object.assign({}, l, { flag: localeToFlag(l.token) }));
});

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
    @Inject(LOCALE_ID)
    private readonly _localeId: string,
    private readonly _naturalLanguages: NaturalLanguagesService
  ) {
  }

  /**
   * @return The current URL for the given language token.
   */
  public urlForLanguage(langToken: string) {
    return (this._naturalLanguages.urlForLanguage(langToken));
  }
}
