import { Component, Input } from "@angular/core";

import { CodeResource } from "../../shared/syntaxtree";
import { FixedSidebarBlock, FixedBlocksSidebar } from "../../shared/block";

import { DragService } from "../drag.service";
import { state, style, trigger } from "@angular/animations";
import { CodeSidebarHighlightService } from "./code-sidebar-highlight.service";
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

  blockStates: Record<string, SidebarBackgroundState>;

  constructor(
    private _dragService: DragService,
    private _highlightService: CodeSidebarHighlightService
  ) {}

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

  /**
   * Gets the current background state for a draggable block
   *
   * @param displayName name of the draggable block
   * @returns state of the background (neutral or highlighted)
   */
  getBackgroundState(displayName: string): Observable<string> {
    return this._highlightService
      .isHighlighted(displayName)
      .pipe(
        map((isHighlighted) => (isHighlighted ? "highlighted" : "neutral"))
      );
  }
}
