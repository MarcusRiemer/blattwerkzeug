import { Component } from "@angular/core";

import { of } from "rxjs";
import { map, shareReplay, switchMap } from "rxjs/operators";

import { GrammarGeneratedByGQL } from "../../generated/graphql";

import { CodeResource } from "../shared";
import { tailorResourceReferences } from "../shared/syntaxtree/tailor-resource-references";

import { CurrentCodeResourceService } from "./current-coderesource.service";
import { DragService } from "./drag.service";
import { ProjectService } from "./project.service";

@Component({
  templateUrl: "templates/navbar.html",
  selector: "editor-navbar",
})
export class NavbarComponent {
  constructor(
    private readonly _projectService: ProjectService,
    private readonly _dragService: DragService,
    private readonly _grammarGeneratedBy: GrammarGeneratedByGQL,
    private readonly _currentCodeResource: CurrentCodeResourceService
  ) {}

  readonly hasSqlCode$ = this._projectService.activeProject.pipe(
    switchMap((p) => p.codeResources),
    switchMap((codeResources) => codeResources.emittedLanguage$),
    map((emittedLanguage) => emittedLanguage.programmingLanguageId === "sql")
  );

  readonly currentDatabaseName$ = this._projectService.activeProject.pipe(
    map((p) => p.currentDatabaseName),
    shareReplay(1)
  );

  readonly imagesEnabled$ = of(false);

  readonly project$ = this._projectService.activeProject;

  /**
   * The user has decided to start dragging something from the sidebar.
   */
  async startResourceDrag(evt: DragEvent, c: CodeResource) {
    // Only start drags if there is a current code resource, otherwise
    // the <block-host> is irritated because there is no resource
    // to validate against.
    if (this._currentCodeResource.peekResource) {
      const tailoredNode = await tailorResourceReferences(
        c.toModel(),
        this._grammarGeneratedBy
      );
      if (tailoredNode.length > 0) {
        this._dragService.dragStart(evt, tailoredNode);
      }
    }

    // Explicitly cancel the builtin drag operation
    return false;
  }
}
