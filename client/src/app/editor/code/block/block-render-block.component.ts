import { Component, Input, OnInit } from '@angular/core';

import { Node, CodeResource } from '../../../shared/syntaxtree';
import { VisualBlockDescriptions } from '../../../shared/block';

import { DragService } from '../../drag.service';

import { CurrentCodeResourceService } from '../../current-coderesource.service';

import { calculateDropLocation } from './drop-utils';

/**
 * Renders a single and well known visual element of a node.
 */
@Component({
  templateUrl: 'templates/block-render-block.html',
  selector: `editor-block-render-block`
})
export class BlockRenderBlockComponent implements OnInit {
  @Input() public codeResource: CodeResource;
  @Input() public node: Node;
  @Input() public visual: VisualBlockDescriptions.EditorBlock;

  constructor(
    private _dragService: DragService,
    private _currentCodeResource: CurrentCodeResourceService,
  ) {
  }

  ngOnInit() {

  }

  /**
   * @return The location a drop should occur in.
   */
  get dropLocation() {
    return (calculateDropLocation(this.node, this.visual.dropTarget));
  }

  /**
   * Handles the drop events on the empty drop
   */
  onDrop() {
    const desc = this._dragService.peekDragData.draggedDescription;
    this._currentCodeResource.peekResource.insertNode(this.dropLocation, desc);
  }
}
