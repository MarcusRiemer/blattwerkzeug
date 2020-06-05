import { Injectable, OnDestroy } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { MatSnackBar } from "@angular/material/snack-bar";

import { Subscription } from "rxjs";
import { first } from "rxjs/operators";

import { GrammarDescription, GrammarListDescription } from "../syntaxtree";

import { ServerApiService } from "./serverapi.service";
import { ListData } from "./list-data";
import { IndividualData } from "./individual-data";
import { MutateData } from "./mutate-data";
import { ServerTasksService } from "./server-tasks.service";

const urlResolver = (serverApi: ServerApiService) => {
  return (id: string) => serverApi.individualGrammarUrl(id);
};

/**
 * Cached access to individual grammars
 */
@Injectable()
export class IndividualGrammarDataService extends IndividualData<
  GrammarDescription
> {
  constructor(serverApi: ServerApiService, http: HttpClient) {
    super(http, urlResolver(serverApi), "Grammar");
  }
}

@Injectable()
export class MutateGrammarService extends MutateData<GrammarDescription> {
  public constructor(
    http: HttpClient,
    snackBar: MatSnackBar,
    private _serverApi: ServerApiService
  ) {
    super(http, snackBar, urlResolver(_serverApi), "Grammar");
  }

  async regenerateForeignTypes(grammarId: string) {
    const url = this._serverApi.individualGrammarRegenerateForeignTypes(
      grammarId
    );
    const result = await this._http
      .post<GrammarDescription>(url, null)
      .pipe(first())
      .toPromise();

    // TODO: This should also update the cached instance in the
    //       IndividualGrammarDataService
    this._listInvalidated.next();

    return result;
  }
}

/**
 * Cached access to lists of grammars.
 */
@Injectable()
export class ListGrammarDataService extends ListData<GrammarListDescription>
  implements OnDestroy {
  private _subscriptions: Subscription[] = [];

  constructor(
    serverApi: ServerApiService,
    http: HttpClient,
    mutateService: MutateGrammarService,
    serverTaskService: ServerTasksService
  ) {
    super(http, serverApi.getGrammarListUrl(), serverTaskService);

    const s = mutateService.listInvalidated.subscribe(() =>
      this.listCache.refresh()
    );
    this._subscriptions = [s];
  }

  ngOnDestroy() {
    this._subscriptions.forEach((s) => s.unsubscribe());
    this._subscriptions = [];
  }
}
