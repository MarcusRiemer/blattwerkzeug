import { Component } from "@angular/core";

import { CurrentCodeResourceService } from "../current-coderesource.service";
import { ErrorCodes, SyntaxTree } from "src/app/shared";
import { first, map, switchMap, withLatestFrom } from "rxjs/operators";
import { DragService } from "../drag.service";
import { Subscription, interval } from "rxjs";

// TODO2: Pre /Prompt Area einrichten (JSON AST im BW als bsp. über Debug Options anzeigbar) ✅
// TODO3: Prompt schreiben mit den Informationen die hier bereits generiert ✅
// TODO4: Copy to Clipboard Button einrichten ✅
// TODO5: Subscribe in Z38 unsiubscriben und mit replay subject speichern
/**
 * Assists the user in writing code by providing feedback and tips.
 */
@Component({
  templateUrl: "templates/ai-coach.html",
})
export class AiCoachComponent {
  public lastDraggedBlock: any = null;
  public timerValue = 0;

  private _subscription: Subscription;
  private _lastCurrentDraggedBlock: any = null;

  constructor(
    private _currentCodeResource: CurrentCodeResourceService,
    private _dragService: DragService
  ) {
    /**
     *  Subscribe to the current drag service to track the currently dragged block
     *  and update the last dragged block when the drag operation ends.
     */
    //subscribe in Z38 muss noch unsubscribed werden
    // noch besser speichern in einem replay subject, innerhalb der pipe
    this._dragService.currentDrag
      .pipe(withLatestFrom(this.currentlyDraggedBlock$))
      .subscribe(([drag, currentlyDraggedBlock]) => {
        // The current drag operation goes on as long as the drag is (not un)defined
        if (drag !== undefined) {
          this._lastCurrentDraggedBlock = currentlyDraggedBlock;
          this._subscription.unsubscribe();
          this.timerValue = 0;
        }
        // The current drag operation ends if the draf is undefined
        if (drag === undefined) {
          this.lastDraggedBlock = this._lastCurrentDraggedBlock;
          this._subscription = interval(1000).subscribe(() => {
            this.timerValue++;
          });
        }
      });
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

  readonly errors$ = this.result$.pipe(
    map((result) =>
      result.errors.map((e) => {
        return { ...e };
      })
    )
  );

  /**
   * Counts the number of holes by counting the number of errors
   * that are either MissingChild or InvalidMinOccurences.
   * TODO: Führt zu Fehlverhalten bei Desc und Asc, da diese keine Fehler werfen => Bessere Lösung finden
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

  //   readonly currentTree$ = this._currentCodeResource.currentTree;
  //   readonly currentTreeModel$ = this._currentCodeResource.currentTree.pipe(
  //     map((tree) => tree?.toModel())
  //   );

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
    const lang = await this.emittedLanguage$.pipe(first()).toPromise();
    const blockTree = new SyntaxTree(
      this.lastDraggedBlock[0] ?? this.lastDraggedBlock
    );
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
        "Mein Aufgabe lautet wie folgt:" +
        task +
        "." +
        "Ich möchte nun dafür diesen Code vervollständigen:" +
        generatedCode +
        ".";
      if (this.lastDraggedBlock) {
        const lastDraggedBlockCode = await this.getCodeForLastDraggedBlock();
        prompt +=
          "Dafür habe ich zuletzt diesen Codeabschnitt genutzt: " +
          lastDraggedBlockCode +
          ".";
      }
      if (numberOfErrors > 0) {
        prompt += " Dabei werden mir " + numberOfErrors + " Fehler angezeigt.";
      }
      prompt +=
        " Bitte gib mir Feedback zu meinem aktuellen Code und wie ich weitermachen sollte, um meine Aufgabe zu erledigen. Gib mir aber nicht die Lösung vor, sondern nur Hinweise.";

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
    this._subscription.unsubscribe();
  }
}
