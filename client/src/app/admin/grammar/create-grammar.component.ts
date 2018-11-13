import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { first } from 'rxjs/operators';

import { ServerDataService } from '../../shared/server-data.service';
import { ServerApiService } from '../../shared/serverapi.service';
import { GrammarDescription } from '../../shared/syntaxtree';
import { LanguageService } from '../../shared/language.service';

/**
 * A comprehensive way to create new grammars
 */
@Component({
  templateUrl: 'templates/create-grammar.html',
  selector: 'create-grammar'
})
export class CreateGrammarComponent {
  // Synced with form
  grammar: GrammarDescription = {
    id: undefined,
    name: "",
    slug: undefined,
    programmingLanguageId: "",
    root: "",
    types: {}
  };

  constructor(
    private _serverData: ServerDataService,
    private _serverApi: ServerApiService,
    private _languageService: LanguageService,
    private _http: HttpClient,
    private _router: Router,
  ) {
  }

  readonly availableProgrammingLanguages = this._languageService.availableLanguages;

  /**
   * Attempts to create the specified block language
   */
  public submitForm() {
    const toCreate: GrammarDescription = JSON.parse(JSON.stringify(this.grammar));
    if (!toCreate.slug) {
      delete toCreate.slug
    }

    this._http
      .post<{ id: string }>(this._serverApi.createGrammarUrl(), this.grammar)
      .subscribe(res => {
        this._serverData.listGrammars.refresh();
        this._router.navigateByUrl(`/admin/grammar/${res.id}`);
      }, err => {
        console.log(err);
      });
  }
}
