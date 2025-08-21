import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

import { Observable } from "rxjs";
import {
  catchError,
  delay,
  map,
  tap,
  shareReplay,
  first,
} from "rxjs/operators";

import {
  CreateCodeResourceGQL,
  UpdateCodeResourceGQL,
} from "../../generated/graphql";

import { ServerApiService } from "../shared";
import { CodeResource } from "../shared/syntaxtree";
import {
  CodeResourceDescription,
  CodeResourceRequestUpdateDescription,
} from "../shared/syntaxtree/coderesource.description";
import { Project } from "../shared/project";

@Injectable({ providedIn: "root" })
export class CodeResourceService {
  /**
   * @param _http Used to do HTTP requests
   * @param _server Used to figure out paths for HTTP requests
   */
  constructor(
    private _http: HttpClient,
    private _server: ServerApiService,
    private _create: CreateCodeResourceGQL,
    private _update: UpdateCodeResourceGQL
  ) {}

  /**
   * Asks the server to create a new block resource.
   */
  createCodeResource(
    project: Project,
    name: string,
    assignment: string,
    blockLanguageId: string,
    programmingLanguageId: string
  ) {
    const toReturn = this._create
      .mutate({
        projectId: project.id,
        name: name,
        assignment: assignment,
        programmingLanguageId: programmingLanguageId,
        blockLanguageId: blockLanguageId,
      })
      .pipe(
        catchError(this.handleError),
        delay(250),
        map(
          (res) =>
            new CodeResource(
              res.data.createCodeResource.codeResource,
              project.resourceReferences
            )
        ),
        shareReplay(1),
        first()
      );

    console.log("Creating code resource");
    return toReturn.toPromise();
  }

  /**
   * Asks the server to duplicate a block resource.
   */
  cloneCodeResource(project: Project, resource: CodeResource) {
    const url = this._server.getCodeResourceCloneUrl(project.slug, resource.id);

    const toReturn = this._http.post<CodeResourceDescription>(url, "").pipe(
      catchError(this.handleError),
      delay(250),
      map((res) => new CodeResource(res, project.resourceReferences)),
      shareReplay(1)
    );

    return toReturn;
  }

  /**
   * Sends a updated code resource to the server
   */
  async updateCodeResource(project: Project, resource: CodeResource) {
    const toReturn = this._update
      .mutate({
        id: resource.id,
        name: resource.name,
        assignment: resource.assignment,
        programmingLanguageId: resource.runtimeLanguageId,
        blockLanguageId: resource.blockLanguageIdPeek,
        // Must use `null` instead of `undefined` to send the key if the AST is empty
        ast: resource.syntaxTreePeek.toModel() ?? null,
      })
      .pipe(
        catchError(this.handleError),
        delay(250),
        tap((_) => resource.markSaved()),
        shareReplay(1),
        first()
      );

    const result = await toReturn.toPromise();
    const affected = result.data.updateCodeResource.affected.map((a) => ({
      name: a.name,
      id: a.id,
      type: a.__typename,
    }));

    console.log("Update affected: ", affected);

    return result;
  }

  /**
   * Deletes the resource with the given ID from the server.
   */
  deleteCodeResource(project: Project, resource: CodeResource) {
    const url = this._server.getCodeResourceUrl(project.slug, resource.id);

    const toReturn = this._http
      .delete<void>(url)
      .pipe(catchError(this.handleError), delay(250));

    return toReturn;
  }

  private handleError(error: Response) {
    // in a real world app, we may send the error to some remote logging infrastructure
    // instead of just logging it to the console
    console.error(error);
    return Observable.throw(error);
  }
}
