import { Component } from "@angular/core";

import { CurrentCodeResourceService } from "../current-coderesource.service";
import { map, withLatestFrom } from "rxjs/operators";
import { DragService } from "../drag.service";
import { BehaviorSubject, Subscription, interval } from "rxjs";
import { AiCoachService } from "./ai-coach.service";
import { state, style, trigger } from "@angular/animations";

/**
 * Assists the user in writing code by providing hints.
 */
@Component({
  templateUrl: "templates/ai-coach.html",
  selector: "ai-coach",
  animations: [
    trigger("coachState", [
      state("visible", style({ opacity: 1 })),
      state("hidden", style({ opacity: 0, display: "none" })),
    ]),
  ],
})
export class AiCoachComponent {
  public timerValue = 0;
  private _subscriptions = new Subscription();
  private _timerSubscription: Subscription;
  private _behaviorSubjectLastDraggedBlock = new BehaviorSubject<any>(null);

  readonly lastDraggedBlock$ =
    this._behaviorSubjectLastDraggedBlock.asObservable();

  public assignmentWithAccentuation: string;

  constructor(
    private _currentCodeResource: CurrentCodeResourceService,
    private _dragService: DragService,
    private _aiService: AiCoachService
  ) {
    /**
     *  Subscribe to the current drag service to track the currently dragged block
     *  and update the last dragged block when the drag operation ends.
     */
    this._subscriptions.add(
      this._dragService.currentDrag
        .pipe(withLatestFrom(this.currentlyDraggedBlock$))
        .subscribe(([drag, currentlyDraggedBlock]) => {
          // The current drag operation goes on as long as the drag is (not un)defined
          if (drag !== undefined) {
            this._behaviorSubjectLastDraggedBlock.next(
              currentlyDraggedBlock ?? null
            );
            if (this._timerSubscription) {
              this._timerSubscription.unsubscribe();
            }
            this.timerValue = 0;
          }
          // The current drag operation ends if the drag is undefined
          if (drag === undefined) {
            this._timerSubscription = interval(1000).subscribe(() => {
              this.timerValue++;
            });
            this._subscriptions.add(this._timerSubscription);
          }
        })
    );
  }

  /**
   * Receive the validation result of the current code resource.
   */
  readonly result$ = this._currentCodeResource.validationResult;

  /**
   * Receive the errors from the validation result.
   */
  readonly errors$ = this.result$.pipe(map((result) => result.errors));

  /**
   * Counts the number of holes by counting the number of errors
   * that are either MissingChild or InvalidMinOccurences.
   */
  readonly countHoles$ = this._aiService.countHoles$;

  /**
   * Receive the currently dragged block from the drag service
   * and map it to the dragged description
   * This will be undefined if no block is currently being dragged.
   * And thereofre the last dragged block is no longer dragged.
   */
  readonly currentlyDraggedBlock$ = this._dragService.currentDrag.pipe(
    map((drag) => drag?.draggedDescription)
  );

  readonly aiHint$ = this._aiService.aiHint$;

  readonly aiCoachState$ = this._aiService.aiCoachState$;

  readonly assignmentWithAccentuation$ =
    this._aiService.assignmentWithAccentuation$;

  applyAiSuggestion() {
    this._aiService.applyProposedBlock();
  }

  /**
   * Uses the new GraphQL Endpoint to get a hint for the current code resource.
   * @returns A hint for the current code resource.
   */
  async onClick() {
    this._aiService.getHintForCurrentCodeResource();
  }

  /**
   * Unsubscribe when the component is destroyed
   */
  ngOnDestroy() {
    this._subscriptions.unsubscribe();
  }
}
