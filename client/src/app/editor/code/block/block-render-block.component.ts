import { Component, Input, ChangeDetectorRef } from '@angular/core';

import { map, withLatestFrom, distinctUntilChanged, tap, combineLatest } from 'rxjs/operators';

import { Node, CodeResource, locationEquals, locationMatchingLength } from '../../../shared/syntaxtree';
import { VisualBlockDescriptions } from '../../../shared/block';
import { arrayEqual } from '../../../shared/util';
import { canEmbraceNode } from '../../../shared/syntaxtree/drop-embrace';

import { DragService } from '../../drag.service';
import { CurrentCodeResourceService } from '../../current-coderesource.service';

export type BackgroundState = "executed" | "replaced" | "neutral";

/**
 * Renders a single and well known visual element of a node.
 */
@Component({
  templateUrl: 'templates/block-render-block.html',
  selector: `editor-block-render-block`
})
export class BlockRenderBlockComponent {
  /**
   * The code resource that is rendered here.
   */
  @Input() public codeResource: CodeResource;

  /**
   * The node to be rendered
   */
  @Input() public node: Node;

  /**
   * The visualisation parameters for this block.
   */
  @Input() public visual: VisualBlockDescriptions.EditorBlock;

  /**
   * Disables any interaction with this block if true.
   */
  @Input() public readOnly = false;

  constructor(
    private _dragService: DragService,
    private _currentCodeResource: CurrentCodeResourceService,
    private _changeDetector: ChangeDetectorRef
  ) {
  }

  /**
   * @return True, if embracing should be enabled for things dropped on this block
   */
  get allowEmbrace() {
    // This is currently a hack: We control embracing globally based on an URL parameter
    if (window && window.location) {
      const url = new URL(window.location.href);
      return (url.searchParams.has("allowEmbrace"));
    } else {
      return (false);
    }
  }

  /**
   * @return The location a drop should occur in.
   */
  get dropLocation() {
    return (this.node.location);
  }

  private readonly _latestDragData = this._dragService.currentDrag.pipe(
    withLatestFrom(this._dragService.isDragInProgress),
  );

  readonly isEmbraceDrop = this._latestDragData.pipe(
    map(([currentDrag, inProgress]) =>
      inProgress && arrayEqual(this.node.location, currentDrag.dropLocation) && this._isEmbraceDrop()
    )
  );

  /**
   * @return True, if the current drop operation would result in an embrace.
   */
  private _isEmbraceDrop() {
    const validator = this.codeResource.validationLanguagePeek.validator;
    const ownLocation = this.node.location;
    const dropCandidates = this._dragService.peekDragData.draggedDescription;

    return (canEmbraceNode(validator, this.node.tree, ownLocation, dropCandidates));
  }

  /**
   * Notifies the drag service about the drag we have just started.
   */
  onStartDrag(evt: MouseEvent) {
    if (!this.readOnly) {
      this._dragService.dragStart(evt, [this.node.toModel()], undefined, {
        node: this.node,
        codeResource: this.codeResource
      });
    }
  }

  /**
   * A mouse has entered the block and might want to drop something.
   */
  onMouseEnter(evt: MouseEvent) {
    if (!this.readOnly && this._dragService.peekIsDragInProgress) {
      this._dragService.informDraggedOver(evt, this.node.location, this.node, {
        allowExact: true,
        allowAnyParent: true,
        allowEmbrace: this.allowEmbrace,
        allowAppend: true,
        allowReplace: true
      });
    }
  }

  /**
   * Determines whether a certain codeblock is currently beeing executed.
   */
  readonly isOnExecutionPath = this._currentCodeResource.currentExecutionLocation
    .pipe(
      map(loc => {
        const matchingLength = locationMatchingLength(this.node.location, loc);
        return (matchingLength !== false && matchingLength > 0 && matchingLength - 1 < loc.length);
      }),
      distinctUntilChanged(),
      tap(_ => this._changeDetector.markForCheck())
    );

  /**
   * Determines whether a certain codeblock is currently beeing executed.
   */
  readonly isCurrentlyExecuted = this._currentCodeResource.currentExecutionLocation
    .pipe(
      map(loc => locationEquals(loc, this.node.location)),
      distinctUntilChanged(),
      tap(_ => this._changeDetector.markForCheck())
    );

  /**
   * True, if this block is currently being replaced.
   */
  readonly isBeingReplaced = this._latestDragData.pipe(
    map(([currentDrag, inProgress]) => {
      if (inProgress && currentDrag.smartDrops.length > 0) {
        const smartDrop = currentDrag.smartDrops[0];

        return (
          smartDrop.operation === "replace"
          && locationEquals(this.node.location, smartDrop.location)
        );
      } else {
        return (false);
      }
    })
  );

  /**
   * All different background states.
   */
  readonly backgroundState = this.isBeingReplaced.pipe(
    combineLatest(this.isCurrentlyExecuted),
    map(([isBeingReplaced, isCurrentlyExecuted]): BackgroundState => {
      if (isBeingReplaced && !this.readOnly) {
        return ("replaced");
      } else if (isCurrentlyExecuted) {
        return ("executed");
      } else {
        return ("neutral");
      }
    })
  );
}
