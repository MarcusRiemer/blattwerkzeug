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
import { Subscription } from "rxjs";

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

  private _subscriptions = new Subscription();

  constructor(
    private _dragService: DragService,
    private _codeHighlightService: CodeHighlightService,
    private _currentHoleLocationService: CurrentHoleLocationService
  ) {}

  ngAfterViewInit() {
    this.subscribeToHighlightChanges();
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

  /**
   * Subscribes to all blocks' highlight states and scrolls to the highlighted block
   */
  private subscribeToHighlightChanges() {
    if (!this.blockSidebar) return;

    this.blockSidebar.categories.forEach((category, categoryIndex) => {
      category.blocks.forEach((block, blockIndex) => {
        const subscription = block.highlightState$.subscribe((state) => {
          if (state === "highlighted") {
            const flatIndex = this.calculateFlatIndex(
              categoryIndex,
              blockIndex
            );

            // Wait for the animation to start to prevent undefined error
            setTimeout(() => {
              this.scrollToBlock(flatIndex);
            }, 100);
          }
        });

        this._subscriptions.add(subscription);
      });
    });
  }

  /**
   * Calculates the flat index of a block in the QueryList
   * (accounts for all blocks across all categories)
   */
  private calculateFlatIndex(
    categoryIndex: number,
    blockIndex: number
  ): number {
    let flatIndex = 0;

    for (let i = 0; i < categoryIndex; i++) {
      flatIndex += this.blockSidebar.categories[i].blocks.length;
    }

    flatIndex += blockIndex;
    return flatIndex;
  }

  /**
   * Scrolls to a specific block by its flat index
   */
  private scrollToBlock(flatIndex: number) {
    const blockArray = this.draggableBlock?.toArray();

    if (blockArray && blockArray[flatIndex]?.nativeElement) {
      blockArray[flatIndex].nativeElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  ngOnDestroy() {
    this._subscriptions.unsubscribe();
  }
}
