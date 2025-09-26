import {
  Component,
  ElementRef,
  Input,
  QueryList,
  ViewChildren,
} from "@angular/core";

import { CodeResource } from "../../shared/syntaxtree";
import { FixedSidebarBlock, FixedBlocksSidebar } from "../../shared/block";

import { DragService } from "../drag.service";
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from "@angular/animations";
import { CodeHighlightService } from "./code-highlight.service";
import { CurrentHoleLocationService } from "../current-hole-location.service";

@Component({
  templateUrl: "templates/draggable-block-list.html",
  selector: "draggable-block-list",
  animations: [
    trigger("background", [
      state("neutral", style({ background: "white" })),
      state("highlighted", style({ background: "#d63384" })),
      transition("neutral => highlighted", animate("500ms ease-out")),
      transition("highlighted => neutral", animate("500ms ease-out")),
    ]),
    trigger("visibility", [
      state("visible", style({ opacity: 1.0, transform: "scale(1.0)" })),
      state(
        "invisible",
        style({ opacity: 0, transform: "scale(0)", display: "none" })
      ),
      transition("visible => invisible", animate("500ms ease-out")),
      transition("invisible => visible", animate("500ms ease-out")),
    ]),
  ],
})
export class DraggableBlockListComponent {
  @ViewChildren("draggableBlock") draggableBlock: QueryList<ElementRef>;

  @Input()
  blockSidebar: FixedBlocksSidebar;

  @Input()
  codeResource: CodeResource;

  constructor(
    private _dragService: DragService,
    private _codeHighlightService: CodeHighlightService,
    private _currentHoleLocationService: CurrentHoleLocationService
  ) {}

  //TODO: I want to use the scrollIntoView, after a highlight happened, not after intialization
  // Mit subscribe dann "weiterleiten" an sidebar-blocks.ts, unsubscribe nicht vergessen
  ngAfterViewInit() {
    //I have to add a timeout here, because of the animations, otherwise I get an undefined error
    setTimeout(() => {
      this.draggableBlock?.forEach((block) => {
        if (block?.nativeElement) {
          block.nativeElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
    }, 100);
  }
  /**
   * The user has decided to start dragging something from the sidebar.
   */
  startDrag(evt: DragEvent, block: FixedSidebarBlock) {
    this._codeHighlightService.clearHighlight();

    this._currentHoleLocationService.clearCurrentHoleLocation();

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
