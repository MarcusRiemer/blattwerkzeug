import { Component } from "@angular/core";

import { CurrentCodeResourceService } from "../current-coderesource.service";
import { ErrorCodes, SyntaxTree } from "src/app/shared";
import { first, map, switchMap, withLatestFrom } from "rxjs/operators";
import { DragService } from "../drag.service";
import { ReplaySubject, Subscription, interval } from "rxjs";

/**
 * Assists the user in writing code by providing feedback and tips.
 */
@Component({
  templateUrl: "templates/ai-coach.html",
})
export class AiCoachComponent {
  public timerValue = 0;

  private _subscriptions = new Subscription();
  private _timerSubscription: Subscription;
  private _replaySubjectLastDraggedBlock = new ReplaySubject<any>(1);
  readonly lastDraggedBlock$ =
    this._replaySubjectLastDraggedBlock.asObservable();

  constructor(
    private _currentCodeResource: CurrentCodeResourceService,
    private _dragService: DragService
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
            this._replaySubjectLastDraggedBlock.next(
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
   * To get the current code resource that is being edited.
   * This is the resource that is currently displayed in the editor.
   */
  readonly codeResource$ = this._currentCodeResource.currentResource;

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
  readonly countHoles$ = this.result$.pipe(
    map(
      (result) =>
        result.errors.filter(
          (e) =>
            e.code === ErrorCodes.MissingChild ||
            e.code === ErrorCodes.InvalidMinOccurences
        ).length
    )
  );

  /**
   * Receive the generated code from the current code resource
   */
  readonly generatedCode$ = this.codeResource$.pipe(
    switchMap((resource) => resource.generatedCode$)
  );

  /**
   * Receive the currently dragged block from the drag service
   * and map it to the dragged description
   * This will be undefined if no block is currently being dragged.
   * And thereofre the last dragged block is no longer dragged.
   */
  readonly currentlyDraggedBlock$ = this._dragService.currentDrag.pipe(
    map((drag) => drag?.draggedDescription)
  );

  /**
   * Receive the emitted language from the current code resource.
   */
  readonly emittedLanguage$ = this.codeResource$.pipe(
    switchMap((resource) => resource.emittedLanguage$)
  );

  /**
   * Translates the last dragged block from json format into code.
   * @returns The code for the last dragged block.
   * @requires The last dragged block must be set.
   */
  async getCodeForLastDraggedBlock() {
    const lastDraggedBlock = await this.lastDraggedBlock$
      .pipe(first())
      .toPromise();
    const lang = await this.emittedLanguage$.pipe(first()).toPromise();
    const blockTree = new SyntaxTree(lastDraggedBlock[0] ?? lastDraggedBlock);
    return lang.emitTree(blockTree);
  }

  /**
   * Checks if the browser supports the clipboard API.
   */
  readonly hasClipboard = !!navigator.clipboard;

  /**
   * Copies a prompt to the clipboard that can be used to ask for help.
   */
  async copyPromptToClipboard() {
    //TODO: Wenn noch kein Block gezogen, hängt der Code hier
    const lastDraggedBlock = await this.lastDraggedBlock$
      .pipe(first())
      .toPromise();

    const numberOfErrors = await this.errors$
      .pipe(
        map((errors) => errors.length),
        first()
      )
      .toPromise();

    if (this.hasClipboard) {
      const generatedCode = await this.generatedCode$.pipe(first()).toPromise();
      const task = "Zeige die Auftritte pro Charakter an";

      let prompt =
        "Meine Aufgabe lautet wie folgt: " +
        task +
        ". " +
        "Ich möchte nun dafür diesen Code vervollständigen: " +
        generatedCode +
        ". ";
      if (lastDraggedBlock) {
        const lastDraggedBlockCode = await this.getCodeForLastDraggedBlock();
        prompt +=
          "Dafür habe ich zuletzt diesen Codeabschnitt genutzt: " +
          lastDraggedBlockCode +
          ". ";
      }
      if (numberOfErrors > 0) {
        prompt += " Dabei werden mir " + numberOfErrors + " Fehler angezeigt. ";
      }
      prompt +=
        "Bitte gib mir Feedback zu meinem aktuellen Code und wie ich weitermachen sollte, um meine Aufgabe zu erledigen. Gib mir aber nicht die Lösung vor, sondern nur Hinweise. ";

      await navigator.clipboard.writeText(prompt);
      console.log("Copied the following prompt to the clipboard", prompt);
    } else {
      alert("Sorry, no clipboard available");
    }
  }

  /**
   * Unsubscribe when the component is destroyed
   */
  ngOnDestroy() {
    this._subscriptions.unsubscribe();
  }
}
