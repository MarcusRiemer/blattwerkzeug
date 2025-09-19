import { Injectable } from "@angular/core";
import { BehaviorSubject, interval, Subscription } from "rxjs";
import { CurrentCodeResourceService } from "../current-coderesource.service";
import { DragService } from "../drag.service";
import { AiHintCodeResourceGQL } from "src/generated/graphql";
import { CodeHighlightService } from "./code-highlight.service";
import { first, map, switchMap, withLatestFrom } from "rxjs/operators";
import { ErrorCodes, SyntaxTree } from "src/app/shared";

@Injectable()
export class AiCoachService {
  readonly aiHint$ = new BehaviorSubject<string>(null);
  readonly assignmentWithAccentuation$ = new BehaviorSubject<string>(null);
  public timerValue = 0;
  private _subscriptions = new Subscription();
  private _timerSubscription: Subscription;
  private _behaviorSubjectLastDraggedBlock = new BehaviorSubject<any>(null);
  readonly lastDraggedBlock$ =
    this._behaviorSubjectLastDraggedBlock.asObservable();

  constructor(
    private _currentCodeResource: CurrentCodeResourceService,
    private _dragService: DragService,
    private _aiHintCodeResource: AiHintCodeResourceGQL,
    private _highlightService: CodeHighlightService
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
   * To get the current code resource that is being edited.
   * This is the resource that is currently displayed in the editor.
   */
  readonly codeResource$ = this._currentCodeResource.currentResource;

  /**
   * Receive the validation result of the current code resource.
   */
  readonly result$ = this._currentCodeResource.validationResult;

  /**
   * Receive the current block language from the code resource.
   */
  readonly currentBlockLanguage$ = this.codeResource$.pipe(
    switchMap((resource) => resource.blockLanguage$)
  );

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
   * @param lastDraggedBlock The last dragged block in json format.
   * @returns The code for the last dragged block.
   * @requires The last dragged block must be set.
   */
  async getCodeForLastDraggedBlock(lastDraggedBlock: any) {
    if (!lastDraggedBlock) {
      console.warn("No last dragged block available");
      return "";
    }
    const lang = await this.emittedLanguage$.pipe(first()).toPromise();
    const blockTree = new SyntaxTree(lastDraggedBlock[0] ?? lastDraggedBlock);
    return lang.emitTree(blockTree);
  }

  /**
   * Uses the new GraphQL Endpoint to get a hint for the current code resource.
   * @returns A hint for the current code resource.
   */
  async getHintForCurrentCodeResource() {
    const codeResource = await this.codeResource$.pipe(first()).toPromise();
    const generatedCode = await this.generatedCode$.pipe(first()).toPromise();
    //TODO: Zusammen mit den anderen Client-Infos (Anzahl Fehler, Anzahl Löcher) in ein Interface
    const lastDraggedBlock = await this.lastDraggedBlock$
      .pipe(first())
      .toPromise();
    let lastDraggedBlockCode = null;
    if (lastDraggedBlock) {
      lastDraggedBlockCode = await this.getCodeForLastDraggedBlock(
        lastDraggedBlock
      );
    }
    const aiHintMutation = await this._aiHintCodeResource
      .mutate({
        id: codeResource.id,
        compiledSource: generatedCode,
        lastDraggedBlock: lastDraggedBlockCode,
      })
      .toPromise();

    if (aiHintMutation.data?.aiHintCodeResource.nextBlock) {
      this.provideHighlightInformation(
        aiHintMutation.data?.aiHintCodeResource.nextBlock
      );
    } else {
      this.provideHighlightInformation("");
    }

    if (aiHintMutation.data?.aiHintCodeResource.assignmentWithAccentuation) {
      this.assignmentWithAccentuation$.next(
        aiHintMutation.data?.aiHintCodeResource.assignmentWithAccentuation.replace(
          /\*\*(.*?)\*\*/g,
          "<strong>$1</strong>"
        )
      );
    } else {
      this.assignmentWithAccentuation$.next(
        "no assignment with accentuation available"
      );
    }

    return this.aiHint$.next(
      aiHintMutation.data?.aiHintCodeResource.answerText || "No hint available"
    );
  }

  /**
   * Provides the information about which sidebar block to highlight
   */
  provideHighlightInformation(value: string) {
    this._highlightService.clearHighlight();
    this._highlightService.setHighlightedBlock(value);
  }
  /**
   * Unsubscribe when the component is destroyed
   */
  ngOnDestroy() {
    this._subscriptions.unsubscribe();
  }
}
