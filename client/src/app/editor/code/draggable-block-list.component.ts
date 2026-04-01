import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";

import {
  CodeResource,
  NodeDescription,
  NodeLocationStep,
  Validator,
} from "../../shared/syntaxtree";
import {
  FixedSidebarBlock,
  FixedBlocksSidebar,
  FixedBlocksSidebarCategory,
} from "../../shared/block";

import { DragService } from "../drag.service";
import { Observable, of, pipe } from "rxjs";
import { TrackCategory } from "src/app/shared/analytics.service";
import { inject } from "blockly";
import { CurrentCodeResourceService } from "../current-coderesource.service";
import { first } from "rxjs/operators";

@Component({
  templateUrl: "templates/draggable-block-list.html",
  selector: "draggable-block-list",
})
export class DraggableBlockListComponent {
  @Input()
  blockSidebar: FixedBlocksSidebar;

  @Input()
  codeResource: CodeResource;

  filteredCategories: Array<FixedBlocksSidebarCategory>;

  validator: Validator | undefined;

  currentHoleDropStep: NodeLocationStep;

  constructor(
    private _dragService: DragService,
    private readonly _currentCodeResource: CurrentCodeResourceService
  ) {
    this._currentCodeResource.validator$
      .pipe(first())
      .toPromise()
      .then((v) => (this.validator = v));
  }

  /**
   * The user has decided to start dragging something from the sidebar.
   */
  startDrag(evt: DragEvent, block: FixedSidebarBlock) {
    try {
      const tailoredNode = block.tailoredBlockDescription(
        this.codeResource.syntaxTreePeek
      );
      this._dragService.dragStart(evt, tailoredNode, {
        sidebarBlockDescription: block,
      });
    } catch (e) {
      alert(e);
    }
  }

  //TODO 5: Brauche ich das hier überhaupt noch? ANTWORT: NEIN
  /*isVisibleInSidebar(block: NodeDescription | FixedSidebarBlock) {
    if (this.validator) {
      const result = this._currentCodeResource.currentHoleMatchesBlock2(
        block,
        this.validator
      );
      return result;
    }
    return true;
  }*/
}
