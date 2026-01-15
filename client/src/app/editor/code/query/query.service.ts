import { Injectable } from "@angular/core";
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from "@angular/common/http";

import { Observable, of } from "rxjs";
import { catchError, delay, first, map } from "rxjs/operators";

import {
  ArbitraryQueryRequestDescription,
  QueryParamsDescription,
  QueryResponseDescription,
} from "../../../shared/syntaxtree/sql/query.description";
import {
  ServerApiService,
  DatabaseQueryErrorDescription,
} from "../../../shared";
import { CodeResource, NodeDescription } from "../../../shared/syntaxtree";
import { ProjectService } from "../../project.service";

export { QueryParamsDescription };

/**
 * A nicely wrapped result of a query.
 */
export class QueryResultRows {
  constructor(private readonly _desc: QueryResponseDescription) {}

  // The columns for the current result set
  readonly columns = this._desc.columns;

  // The rows of the current result set
  readonly rows = this._desc.rows;

  // The number of data rows that got returned
  readonly subsetRowCount = this.rows.length;

  // True, if the total number of rows is unknown
  readonly unknownTotal = this._desc.unknownTotal;

  // The user facing number of rows
  readonly totalRowCount = this.unknownTotal ? "???" : this._desc.totalCount;

  /**
   * @return True, if the result is only a partial result.
   */
  get isPartial() {
    return this.unknownTotal || this._desc.totalCount > this.subsetRowCount;
  }
}

export class QueryResultError {
  constructor(public readonly data: DatabaseQueryErrorDescription) {}
}

export type QueryResult = QueryResultRows | QueryResultError;

export type ArbitraryTreeQuery = { ast: NodeDescription; grammarId: string };

/**
 * Allows interaction with the query specific operations
 * of the server.
 */
@Injectable({ providedIn: "root" })
export class QueryService {
  /**
   * @param _http Used to do HTTP requests
   * @param _server Used to figure out paths for HTTP requests
   */
  constructor(
    private _http: HttpClient,
    private _server: ServerApiService,
    private _projectService: ProjectService
  ) {}

  /**
   * Sends the AST of the given resource to the server in order to execute
   * it over there.
   *
   * @param sqlResource A code resource that compiles to SQL.
   * @param params The parameters to run this query.
   */
  async runArbitraryQuery(
    sqlResource: CodeResource | ArbitraryTreeQuery,
    params: QueryParamsDescription
  ): Promise<QueryResult> {
    let headers = new HttpHeaders({ "Content-Type": "application/json" });

    const url = this._server.getRunQueryUrl(
      this._projectService.cachedProject.slug
    );

    const ast =
      sqlResource instanceof CodeResource
        ? sqlResource.syntaxTreePeek.toModel()
        : sqlResource.ast;
    const grammarId =
      sqlResource instanceof CodeResource
        ? (await sqlResource.blockLanguagePeek).grammarId
        : sqlResource.grammarId;

    const body: ArbitraryQueryRequestDescription = {
      ast,
      grammarId,
      params: params,
    };

    const toReturn: Observable<QueryResult> = this._http
      .post<QueryResponseDescription>(url, JSON.stringify(body), {
        headers: headers,
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          const errorData = error.error as DatabaseQueryErrorDescription;
          return of(new QueryResultError(errorData));
        }),
        delay(500),
        map((res) =>
          res instanceof QueryResultError ? res : new QueryResultRows(res)
        ),
        first()
      );

    return toReturn.toPromise();
  }
}
