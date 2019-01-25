import { Component, Input } from '@angular/core';
import { trigger, state, style } from '@angular/animations';

import { map, withLatestFrom } from 'rxjs/operators';

import { arrayEqual } from '../../../shared/util';
import { Node, CodeResource } from '../../../shared/syntaxtree';
import { VisualBlockDescriptions } from '../../../shared/block';

import { DragService } from '../../drag.service';

import { CurrentCodeResourceService } from '../../current-coderesource.service';

import { BlockDropProperties } from './block-drop-properties';
import { calculateDropLocation, calculateDropTargetState } from './drop-utils';


/**
 * Renders a single and well known visual element of a node.
 */
@Component({
  templateUrl: 'templates/block-render-drop-target.html',
  selector: `editor-block-render-drop-target`,
  animations: [
    trigger('availability', [
      state('none', style({
        display: 'none',
      })),
      state('visible', style({
        backgroundColor: 'transparent',
      })),
      state('available', style({
        backgroundColor: 'green',
      })),
      state('self', style({
        backgroundColor: 'yellow',
      })),
    ])
  ]
})
export class BlockRenderDropTargetComponent implements BlockDropProperties {
  @Input() public codeResource: CodeResource;
  @Input() public node: Node;
  @Input() public visual: VisualBlockDescriptions.EditorDropTarget;

  constructor(
    private _dragService: DragService,
    private _currentCodeResource: CurrentCodeResourceService,
  ) {
  }

  readonly isDropTarget = this._dragService.currentDrag.pipe(
    withLatestFrom(this._dragService.isDragInProgress),
    map(([currentDrag, inProgress]) => {
      if (inProgress) {
        if (arrayEqual(currentDrag.dropLocation, this.dropLocation)) {
          // We would drop something in the location we are a placeholder.
          return (true);
        } else {
          return (false);
        }
      } else {
        return (false);
      }
    })
  );

  readonly thisBlock = this;

  /**
   * @return The location a drop should occur in. This depends on the configuration in the language model.
   */
  get dropLocation() {
    return (calculateDropLocation(this.node, this.visual.dropTarget));
  }

  /**
   * @return The current animation state
   */
  readonly currentAvailability = this._dragService.currentDrag
    .pipe(map(drag => calculateDropTargetState(drag, this)));

  onMouseEnter(evt: MouseEvent) {
    if (this._dragService.peekIsDragInProgress) {
      this._dragService.informDraggedOver(evt, this.dropLocation, this.node);
    }
  }
}
