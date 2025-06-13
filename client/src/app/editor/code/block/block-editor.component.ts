import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { ComponentPortal } from "@angular/cdk/portal";
import { MatLegacyDialog as MatDialog } from "@angular/material/legacy-dialog";

import { Observable } from "rxjs";
import { map, switchMap, first, combineLatest, take } from "rxjs/operators";

import { PerformDataService } from "../../../shared/authorisation/perform-data.service";
import { EditorComponentDescription } from "../../../shared/block/block-language.description";
import { MessageDialogComponent } from "../../../shared/message-dialog.component";

import { EditorToolbarService } from "../../toolbar.service";
import { CurrentCodeResourceService } from "../../current-coderesource.service";
import { DragService } from "../../drag.service";
import { CodeResourceService } from "../../coderesource.service";
import { BlockDebugOptionsService } from "../../block-debug-options.service";
import { ProjectService } from "../../project.service";
import { SidebarService } from "../../sidebar.service";

import { CodeSidebarComponent } from "../code-sidebar.component";
import { EditorComponentsService } from "../editor-components.service";

interface PlacedEditorComponent {
  portal: Promise<ComponentPortal<{}>>;
  columnClasses: string[];
}

/**
 * The "usual" editor folks will interact with. Is configurable to display many different
 * components.
 */
@Component({
  templateUrl: "templates/block-editor.html",
})
export class BlockEditorComponent implements OnInit, OnDestroy {
  /**
   * Subscriptions that need to be released
   */
  private _subscriptionRefs: any[] = [];

  public readOnly = false;

  constructor(
    private _toolbarService: EditorToolbarService,
    private _dragService: DragService,
    private _currentCodeResource: CurrentCodeResourceService,
    private _projectService: ProjectService,
    private _codeResourceService: CodeResourceService,
    private _router: Router,
    private _route: ActivatedRoute,
    private _editorComponentsService: EditorComponentsService,
    private _debugOptions: BlockDebugOptionsService,
    private _sidebarService: SidebarService,
    private _matDialog: MatDialog,
    private _performData: PerformDataService
  ) {}

  ngOnInit(): void {
    this._toolbarService.resetItems();
    this._toolbarService.savingEnabled = false;

    // Wiring up the "switch to other editor"-button
    let btnBlocklyEditor = this._toolbarService.addButton(
      "blockly-editor",
      "Blockly Editor",
      "puzzle-piece"
    );
    const refBlockly = btnBlocklyEditor.onClick
      .pipe(take(1))
      .subscribe(async (_) => {
        const snap = this._router.url;
        this._router.navigateByUrl(snap + "ly");
      });

    // Reacting to saving
    this._toolbarService.savingEnabled = true;
    let btnSave = this._toolbarService.saveItem;
    btnSave.performDesc = this._performData.project.update(this.peekProject.id);

    const refSave = btnSave.onClick.subscribe(async () => {
      btnSave.isInProgress = true;
      await this._codeResourceService.updateCodeResource(
        this.peekProject,
        this.peekResource
      );
      btnSave.isInProgress = false;
    });

    // Making a copy
    const btnClone = this._toolbarService.addButton(
      "clone",
      "Klonen",
      "files-o",
      undefined,
      this._performData.project.update(this.peekProject.id)
    );
    const refClone = btnClone.onClick.subscribe((_) => {
      this._codeResourceService
        .cloneCodeResource(this.peekProject, this.peekResource)
        .pipe(first())
        .subscribe((clone) => {
          this.peekProject.addCodeResource(clone);
          this._router.navigate([clone.id], { relativeTo: this._route.parent });
        });
    });

    // Deleting this code resource
    const btnDelete = this._toolbarService.addButton(
      "delete",
      "Löschen",
      "trash",
      undefined,
      this._performData.project.update(this.peekProject.id)
    );
    const refDelete = btnDelete.onClick.subscribe(async (_) => {
      const confirmed = await MessageDialogComponent.confirm(this._matDialog, {
        description: $localize`:@@message.ask-delete-resource:Soll diese Resource wirklich gelöscht werden?`,
      });

      if (confirmed) {
        this._codeResourceService
          .deleteCodeResource(this.peekProject, this.peekResource)
          .pipe(first())
          .subscribe((_) => {
            this.peekProject.removedCodeResource(this.peekResource);
            this._router.navigate(["create"], {
              relativeTo: this._route.parent,
            });
          });
      }
    });

    // Keep the sidebar updated
    const refCurrentResource =
      this._currentCodeResource.currentResource.subscribe((c) => {
        this._sidebarService.showSingleSidebar(
          CodeSidebarComponent.SIDEBAR_IDENTIFIER,
          c
        );
      });

    this._subscriptionRefs.push(
      refBlockly,
      refSave,
      refClone,
      refDelete,
      refCurrentResource
    );
  }

  /**
   * Cleans up all acquired references
   */
  ngOnDestroy() {
    this._subscriptionRefs.forEach((ref) => ref.unsubscribe());
    this._subscriptionRefs = [];
  }

  /**
   * @return A peek at the currently edited resource.
   */
  get peekResource() {
    return this._currentCodeResource.peekResource;
  }

  /**
   * @return The resource that is currently edited
   */
  get currentResource() {
    return this._currentCodeResource.currentResource;
  }

  /**
   * @return A peek at the project of the currently edited resource
   */
  get peekProject() {
    return this._projectService.cachedProject;
  }

  /**
   * @return The resolved portal for the given description
   */
  createEditorComponentPortal(desc: EditorComponentDescription) {
    return this._editorComponentsService.createComponent(desc);
  }

  /**
   * These editor components should be shown
   */
  readonly editorComponentDescriptions = this.currentResource.pipe(
    switchMap((c) => c.blockLanguage$),
    combineLatest(
      this._debugOptions.showDropDebug.value$,
      this._debugOptions.showJsonAst.value$,
      this._debugOptions.showLanguageSelector.value$
    ),
    map(([blockLanguage, showDropDebug, showJsonAst, showLanguageSelector]) => {
      // Take all of the default block languages
      const toReturn = [...blockLanguage.editorComponents];

      // Possibly inject something after the block editor
      if (showDropDebug || showJsonAst) {
        const blockEditorIndex = toReturn.findIndex(
          (c) => c.componentType === "block-root"
        );
        if (showDropDebug && blockEditorIndex >= 0) {
          toReturn.splice(blockEditorIndex + 1, 0, {
            componentType: "drop-debug",
          });
        }
        if (showJsonAst && blockEditorIndex >= 0) {
          toReturn.splice(blockEditorIndex + 1, 0, {
            componentType: "json-ast",
          });
        }
      }

      // Possibly inject the renaming component
      if (showLanguageSelector) {
        toReturn.splice(0, 0, { componentType: "code-resource-settings" });
      }

      return toReturn;
    })
  );

  /**
   * The visual components that should be displayed.
   */
  readonly editorComponents: Observable<PlacedEditorComponent[]> =
    //TODO1:Refactor mit Marcus Tipp
    this.editorComponentDescriptions.pipe(
      map((components): EditorComponentDescription[] => {
        console.log("Komponenten:", components);
        // To possibly deactivate the AI Coach
        const aiCoachActive: boolean = true;
        const blockEditorIndex = components.findIndex(
          (c) => c.componentType === "block-root"
        );

        //noch einfacher mit splice(blockEditorIndex, 0, item)
        if (blockEditorIndex >= 0 && aiCoachActive) {
          return components
            .slice(0, blockEditorIndex + 1)
            .concat([{ componentType: "ai-coach", columnClasses: ["col-8"] }])
            .concat(components.slice(blockEditorIndex + 1));
        }

        return components;
      }),
      map((components): PlacedEditorComponent[] =>
        components.map((c) => {
          // Resolved component and sane defaults for components that are displayed
          return {
            portal: this.createEditorComponentPortal(c),
            columnClasses: c.columnClasses || ["col-8"],
          };
        })
      )
    );

  /**
   * When something draggable enters the editor area itself there is no
   * possibility anything is currently dragged over a node. So we inform the
   * drag service about that.
   */
  public onEditorDragEnter(_evt: MouseEvent) {
    if (this._dragService.peekIsDragInProgress) {
      this._dragService.informDraggedOverEditor();
    }
  }
}
