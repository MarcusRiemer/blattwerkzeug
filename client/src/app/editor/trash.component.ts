import { Component } from "@angular/core";
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from "@angular/animations";

import { BehaviorSubject, combineLatest } from "rxjs";
import { map } from "rxjs/operators";

import { DragService } from "./drag.service";
import { TrashService } from "./trash.service";
import { AiCoachService } from "./code/ai-coach.service";

type AnimationState = "available" | "over" | "hidden";

@Component({
  selector: `trash`,
  templateUrl: "templates/trash.html",
  animations: [
    trigger("animationState", [
      state(
        "available",
        style({
          opacity: 0.5,
          transform: "scale(1)",
        })
      ),
      state(
        "over",
        style({
          opacity: 1.0,
          transform: "scale(1.5)",
        })
      ),
      state(
        "hidden",
        style({
          opacity: 0,
          transform: "scale(0)",
          display: "none",
        })
      ),
      /* Hmmpf, surely there must be a way to state "all transitions except
         :enter and :leave"? The "* => *"-syntax takes those into account and
         then animates the initial display. */
      transition("available => over", animate("500ms ease-out")),
      transition("hidden => over", animate("500ms ease-out")),
      transition("hidden => available", animate("500ms ease-out")),
      transition("over => available", animate("500ms ease-out")),
      transition("available => hidden", animate("500ms ease-out")),
      transition("over => hidden", animate("500ms ease-out")),
    ]),
  ],
})
export class TrashComponent {
  constructor(
    private _trashService: TrashService,
    private _dragService: DragService,
    private _aiService: AiCoachService
  ) {}

  /**
   * Communicates the current mouse over state
   */
  private _mouseOver = new BehaviorSubject(false);

  /**
   * Only regards the mouse over state if there is a drag going on.
   */
  readonly animationState = combineLatest(
    this._mouseOver,
    this._trashService.isTrashShown
  ).pipe(
    map(([mouseIn, trashShown]): AnimationState => {
      if (trashShown) {
        if (mouseIn) {
          return "over";
        } else {
          return "available";
        }
      } else {
        return "hidden";
      }
    })
  );

  mouseEnter() {
    this._mouseOver.next(true);
    this._dragService.informDraggedOverTrash();
    this._aiService.behaviorSubjectLastDraggedBlock$.next(null); //when a block is dragged but then not used, ai doesn't have to know about this block
  }

  mouseLeave() {
    this._mouseOver.next(false);
    if (this._dragService && this._dragService.peekIsDragInProgress) {
      this._dragService.informDraggedOverEditor();
    }
  }

  /**
   * @Return An observable that indicates whether the trash would be shown.
   */
  readonly isTrashShown = this._trashService.isTrashShown;
}
