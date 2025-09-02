import { Component, Input } from "@angular/core";

import { CodeResource } from "../../shared/syntaxtree";
import { FixedSidebarBlock, FixedBlocksSidebar } from "../../shared/block";

import { DragService } from "../drag.service";
import { state, style, trigger } from "@angular/animations";
import { CodeHighlightService } from "./code-highlight.service";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export type SidebarBackgroundState = "neutral" | "highlighted";

@Component({
  templateUrl: "templates/draggable-block-list.html",
  selector: "draggable-block-list",
  animations: [
    trigger("background", [
      state("neutral", style({ background: "white" })),
      state("highlighted", style({ background: "#d63384" })),
    ]),
  ],
})
export class DraggableBlockListComponent {
  @Input()
  blockSidebar: FixedBlocksSidebar;

  @Input()
  codeResource: CodeResource;

  constructor(
    private _dragService: DragService,
    private _codeHighlightService: CodeHighlightService
  ) {}

  /**
   * The user has decided to start dragging something from the sidebar.
   */
  startDrag(evt: DragEvent, block: FixedSidebarBlock) {
    this._codeHighlightService.clearHighlight();

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
}
