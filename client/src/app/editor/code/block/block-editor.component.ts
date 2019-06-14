import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router'

import { map, switchMap, first } from 'rxjs/operators';

import { EditorComponentDescription, DropDebugComponentDescription } from '../../../shared/block/block-language.description';

import { EditorComponentsService } from '../editor-components.service';

import { ToolbarService } from '../../toolbar.service';
import { CurrentCodeResourceService } from '../../current-coderesource.service';
import { DragService } from '../../drag.service';
import { CodeResourceService } from '../../coderesource.service';
import { BlockLanguage } from '../../../shared/block';
import { ComponentPortal } from '@angular/cdk/portal';
import { Observable } from 'rxjs';

interface PlacedEditorComponent {
  portal: ComponentPortal<{}>;
  columnClasses: string[];
}

/**
 * The "usual" editor folks will interact with. Displays all sorts
 * of nice and colourful blocks.
 */
@Component({
  templateUrl: 'templates/block-editor.html',
})
export class BlockEditorComponent implements OnInit, OnDestroy {

  /**
   * Subscriptions that need to be released
   */
  private _subscriptionRefs: any[] = [];

  public readOnly = false;

  constructor(
    private _toolbarService: ToolbarService,
    private _dragService: DragService,
    private _currentCodeResource: CurrentCodeResourceService,
    private _codeResourceService: CodeResourceService,
    private _router: Router,
    private _route: ActivatedRoute,
    private _editorComponentsService: EditorComponentsService,
  ) {
  }

  ngOnInit(): void {
    this._toolbarService.resetItems();
    this._toolbarService.savingEnabled = false;

    // Deleting this code resource
    const btnDelete = this._toolbarService.addButton("delete", "Löschen", "trash", "w");
    btnDelete.onClick.subscribe(_ => {
      this._codeResourceService.deleteCodeResource(this.peekResource)
        .pipe(first())
        .subscribe(_ => {
          this.peekProject.removedCodeResource(this.peekResource);
          this._router.navigate(["create"], { relativeTo: this._route.parent })
        });
    });

    // Reacting to saving
    this._toolbarService.savingEnabled = true;
    let btnSave = this._toolbarService.saveItem;

    btnSave.onClick.subscribe(_ => {
      btnSave.isInProgress = true;
      this._codeResourceService.updateCodeResource(this.peekResource)
        .pipe(first())
        .subscribe(_ => btnSave.isInProgress = false);
    });
  }


  /**
   * Cleans up all acquired references
   */
  ngOnDestroy() {
    this._subscriptionRefs.forEach(ref => ref.unsubscribe());
    this._subscriptionRefs = [];
  }

  /**
   * @return A peek at the currently edited resource.
   */
  get peekResource() {
    return (this._currentCodeResource.peekResource);
  }

  /**
   * @return The resource that is currently edited
   */
  get currentResource() {
    return (this._currentCodeResource.currentResource);
  }

  /**
   * @return A peek at the project of the currently edited resource
   */
  get peekProject() {
    return (this.peekResource.project);
  }

  /**
   * @return The resolved portal for the given description
   */
  getEditorComponentPortal(desc: EditorComponentDescription) {
    return (this._editorComponentsService.createComponent(desc));
  }

  /**
   * These editor components should be shown
   */
  readonly editorComponentDescriptions = this.currentResource
    .pipe(
      switchMap(codeResource => codeResource.blockLanguage),
      map(
        (blockLanguage: BlockLanguage) => {
          // Possibly inject the debug component
          const dropDebug: DropDebugComponentDescription = {
            componentType: "drop-debug"
          };
          return ([...blockLanguage.editorComponents, dropDebug]);
        }
      )
    );

  /**
   * The visual components that should be displayed.
   */
  readonly editorComponents: Observable<PlacedEditorComponent[]> = this.editorComponentDescriptions
    .pipe(
      map((components): PlacedEditorComponent[] => components.map(c => {
        // Resolved component and sane defaults for components that are displayed
        return ({
          portal: this.getEditorComponentPortal(c),
          columnClasses: c.columnClasses || ['col-12']
        });
      }))
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
