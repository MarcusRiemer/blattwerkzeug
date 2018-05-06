import { Injectable, Type } from '@angular/core'

import { BehaviorSubject, Observable } from 'rxjs'

import { AvailableLanguages, Language } from './syntaxtree'
import { AvailableLanguageModels, BlockLanguage } from './block'

/**
 * Groups together information about available languages.
 */
@Injectable()
export class LanguageService {
  /**
   * @return All languages that may be used to compile and validate code.
   */
  get availableLanguages(): ReadonlyArray<Language> {
    return (Object.values(AvailableLanguages));
  }

  /**
   * @return All languages that are augmented for use with the UI
   */
  get availableLanguageModels(): ReadonlyArray<BlockLanguage> {
    return (AvailableLanguageModels);
  }

  /**
   * @return IDs of all available language models.
   */
  get availableLanguageModelIds() {
    return (this.availableLanguageModels.map(m => m.id));
  }

  /**
   * @return IDs of all available language models.
   */
  get availableLanguageIds() {
    return (this.availableLanguages.map(m => m.id));
  }

  /**
   * @param slug_or_id The slug of the language model
   * @return The specific LanguageModel that was asked for.
   */
  getLocalBlockLanguage(slug_or_id: string) {
    const toReturn = this.availableLanguageModels.find(l => l.id === slug_or_id || l.slug === slug_or_id);
    if (!toReturn) {
      const available = this.availableLanguageModelIds.join(', ');
      throw new Error(`Unknown language model "${slug_or_id}", known models are: ${available}`);
    }

    return (toReturn);
  }

  /**
   * @param id The id of the language
   * @return The specific Language that was asked for.
   */
  getLanguage(id: string) {
    const toReturn = this.availableLanguages.find(l => l.id === id);
    if (!toReturn) {
      const available = this.availableLanguageIds.join(', ');
      throw new Error(`Unknown language "${id}", known models are: ${available}`);
    }

    return (toReturn);
  }

}
