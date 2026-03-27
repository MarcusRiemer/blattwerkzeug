import { Injectable } from "@angular/core";
import { BehaviorSubject, interval, Subscription } from "rxjs";
import { CurrentCodeResourceService } from "../current-coderesource.service";
import { DragService } from "../drag.service";
import { AiHintCodeResourceGQL } from "src/generated/graphql";
import { CodeHighlightService } from "./code-highlight.service";
import {
  distinctUntilChanged,
  first,
  map,
  switchMap,
  withLatestFrom,
} from "rxjs/operators";
import {
  CodeResource,
  NodeDescription,
  NodeLocation,
  SyntaxTree,
} from "src/app/shared";
import {
  EmittedHole,
  emittedHoles,
} from "src/app/shared/syntaxtree/codegenerator";
import { isLegalChild, isNodeDescription } from "./block-state";
import { DatabaseSchemaService } from "../database-schema.service";
import { CurrentHoleLocationService } from "../current-hole-location.service";

export type AiCoachState = "neutral" | "thinking" | "idea";

@Injectable()
export class AiCoachService {
  readonly aiHint$ = new BehaviorSubject<string>(null);
  readonly assignmentWithAccentuation$ = new BehaviorSubject<string>(null);
  readonly nextBlock$ = new BehaviorSubject<string>("");
  readonly suggestedHole$ = new BehaviorSubject<EmittedHole>(null);
  readonly aiCoachState$ = new BehaviorSubject<AiCoachState>("neutral");

  public timerValue = 0;
  private _subscriptions = new Subscription();
  private _timerSubscription: Subscription;
  public behaviorSubjectLastDraggedBlock$ = new BehaviorSubject<any>(null);
  readonly lastDraggedBlock$ =
    this.behaviorSubjectLastDraggedBlock$.asObservable();
  private _lastKnownHoles: EmittedHole[] | undefined;

  constructor(
    private _currentCodeResource: CurrentCodeResourceService,
    private _dragService: DragService,
    private _aiHintCodeResource: AiHintCodeResourceGQL,
    private _highlightService: CodeHighlightService,
    private _databaseSchemaService: DatabaseSchemaService,
    private _currentClickedHoleService: CurrentHoleLocationService
  ) {
    /**
     * Subscribe to currentCodeResource to enable resetting AiCoach values when changing assignments
     */
    this._subscriptions.add(
      this._currentCodeResource.currentResource
        .pipe(distinctUntilChanged())
        .subscribe(() => {
          this.reset();
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
  readonly validationResult$ = this._currentCodeResource.validationResult;

  /**
   * Receive the current block language from the code resource.
   */
  readonly currentBlockLanguage$ = this.codeResource$.pipe(
    switchMap((resource) => resource.blockLanguage$)
  );

  /**
   * Receive the errors from the validation result.
   */
  readonly errors$ = this.validationResult$.pipe(
    map((result) => result.errors)
  );

  /**
   * Counts the number of holes by counting the number of errors
   * that are either MissingChild or InvalidMinOccurences.
   */
  readonly countHoles$ = this.validationResult$.pipe(
    map((result) => result.holes.length)
  );

  /**
   * Receive the generated code from the current code resource with markers for holes
   */
  readonly generatedCodeWithHoles$ = this.codeResource$.pipe(
    switchMap((resource) => resource.generatedCodeWithHoles$)
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
   * Receive the currently clicked Hole
   */
  readonly clickedHoleCategoryName$ =
    this._currentClickedHoleService.currentHoleLocation$;

  /**
   * Translates the last dragged block from json format into code.
   * @param lastDraggedBlock The last dragged block in json format.
   * @returns The code for the last dragged block.
   * @requires lastDraggedBlock The last dragged block must be set.
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

  getHoleText(clickedHole: NodeLocation, lastKnownHoles: EmittedHole[]) {
    const clickedHoleCategory = clickedHole[clickedHole.length - 1][0];
    return lastKnownHoles.find(
      (hole) => hole.categoryName === clickedHoleCategory
    ).holeText;
  }

  readonly allDatabaseTablesWithFields$ =
    this._databaseSchemaService.currentSchema.pipe(
      map((tables) =>
        tables.map((table) => ({
          nodeDescription: {
            language: "sql",
            name: "tableIntroduction",
            properties: {
              name: table.name,
            },
          },
          fieldsNodeDescription: table.columns.map((column) => ({
            language: "sql",
            name: "columnName",
            properties: {
              columnName: column.name,
              refTableName: table.name,
            },
          })),
        }))
      )
    );

  /**
   * Uses the new GraphQL Endpoint to get a hint for the current code resource.
   */
  async getHintForCurrentCodeResource() {
    this.aiCoachState$.next("thinking");
    const codeResource = await this.codeResource$.pipe(first()).toPromise();
    const generatedCode = await this.generatedCodeWithHoles$
      .pipe(first())
      .toPromise();
    const validationResult = await this.validationResult$
      .pipe(first())
      .toPromise();
    this._lastKnownHoles = emittedHoles(validationResult);
    //TODO: Zusammen mit den anderen Client-Infos (angeklicktes Loch) in ein Interface
    const clickedHole = await this.clickedHoleCategoryName$
      .pipe(first())
      .toPromise();
    let clickedHoleText = null;
    if (clickedHole) {
      clickedHoleText = this.getHoleText(clickedHole, this._lastKnownHoles);
    }
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
        clickedHoleText: clickedHoleText,
      })
      .toPromise();

    this.aiCoachState$.next("idea");

    if (aiHintMutation.data?.aiHintCodeResource.nextBlock) {
      this.nextBlock$.next(aiHintMutation.data?.aiHintCodeResource.nextBlock);
    } else {
      this.nextBlock$.next("");
    }
    this.provideHighlightInformation(this.nextBlock$.value);

    if (aiHintMutation.data?.aiHintCodeResource.assignmentWithAccentuation) {
      this.assignmentWithAccentuation$.next(
        aiHintMutation.data?.aiHintCodeResource.assignmentWithAccentuation.replace(
          /\*\*(.*?)\*\*/g,
          "<strong>$1</strong>"
        )
      );
    } else {
      this.assignmentWithAccentuation$.next(null);
    }

    if (aiHintMutation.data?.aiHintCodeResource.suggestedHoleText) {
      this.suggestedHole$.next(
        this.approveHoleSuggestion(
          this._lastKnownHoles,
          aiHintMutation.data?.aiHintCodeResource.suggestedHoleText
        )
      );
    } else {
      this.suggestedHole$.next(null);
      console.log("No hole suggested");
    }

    this.aiHint$.next(
      aiHintMutation.data?.aiHintCodeResource.answerText ||
        "Es gibt gerade ein internes Problem. Deswegen kann ich dir gerade keinen Hinweis geben."
    );
  }

  async applyProposedBlock() {
    const hole = this.suggestedHole$.value;
    const codeResource = await this.codeResource$.pipe(first()).toPromise();
    const blockDisplayName = this.nextBlock$.value;

    if (hole && blockDisplayName) {
      const insertionLocation: NodeLocation = [
        ...hole.node.location,
        [hole.categoryName, 0],
      ];

      const foundBlock = await this.findBlockByDisplayName(blockDisplayName);

      const validator = await this._currentCodeResource.validator$
        .pipe(first())
        .toPromise();

      const tree = await this._currentCodeResource.currentTree
        .pipe(first())
        .toPromise();

      // ai may suggest sth wrong or the foundBlock may be null due to an internal error, therefore it needs to be checked, if the suggested combination is valid and if the found block exists
      if (
        foundBlock &&
        isLegalChild([foundBlock], validator, tree, insertionLocation)
      ) {
        codeResource.insertNode(insertionLocation, foundBlock);
      } else {
        console.log(
          `foundHole is no valid match for the suggested hole. Hole: ${hole}, foundBlock: ${foundBlock} and insertionLocation: ${insertionLocation} `,
          hole,
          foundBlock,
          insertionLocation
        );
      }
    } else {
      console.log("no suggested hole to apply to");
    }
  }

  async findBlockByDisplayName(
    blockDisplayName: string
  ): Promise<NodeDescription> {
    const blockLanguage = await this.currentBlockLanguage$
      .pipe(first())
      .toPromise();

    const blocks = blockLanguage.sidebarDesriptions.filter(
      (description) =>
        description.type === "fixedBlocks" ||
        description.type === "databaseSchema"
    );

    if (!blocks) return null;

    for (const block of blocks) {
      if (block.type === "fixedBlocks") {
        for (const category of block.categories) {
          const foundBlock = category.blocks.find(
            (block) => block.displayName === blockDisplayName
          );

          if (foundBlock?.defaultNode) {
            const node = Array.isArray(foundBlock.defaultNode)
              ? foundBlock.defaultNode[0]
              : foundBlock.defaultNode;
            if (isNodeDescription(node)) {
              return node;
            }
          }
        }
      } else if (block.type === "databaseSchema") {
        const allDatabaseTablesWithFields =
          await this.allDatabaseTablesWithFields$.pipe(first()).toPromise();

        for (const table of allDatabaseTablesWithFields) {
          if (table.nodeDescription?.properties?.name === blockDisplayName) {
            return table.nodeDescription;
          }
          for (const field of table.fieldsNodeDescription) {
            if (
              field?.properties?.columnName === blockDisplayName ||
              `${table.nodeDescription?.properties?.name}.${field?.properties?.columnName}` ===
                blockDisplayName
            ) {
              return field;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Checks if the suggested hole is an existing hole and returns it if so
   *
   * @param lastKnownHoles all existing holes
   * @param suggestedHoleText holeText of the suggested hole
   * @returns the suggested Hole, if it is an existing hole
   */
  approveHoleSuggestion(
    lastKnownHoles: EmittedHole[],
    suggestedHoleText: string
  ): EmittedHole {
    const suggestedHole = lastKnownHoles.find(
      (hole) => hole.holeText === suggestedHoleText
    );

    if (!suggestedHole) {
      console.log("The suggested hole does not exist");
      return null;
    }

    return suggestedHole;
  }

  //   async findBlockByDisplayName(blockDisplayName: string): NodeDescription {
  //     const foundBlock = await this.currentBlockLanguage$.pipe(
  //       first(),
  //       map((blockLanguage) =>
  //         blockLanguage.sidebarDesriptions
  //           .find((description) => description.type === "fixedBlocks")
  //           .categories.find(
  //             (category) =>
  //               category.blocks.find(
  //                 (block) => block.displayName === blockDisplayName
  //               ).defaultNode
  //           )
  //       )
  //     ).toPromise();
  //     return foundBlock;
  //   }

  clearSuggestedHole() {
    this.suggestedHole$.next(null);
  }
  /**
   * Provides the information about which sidebar block to highlight
   */
  provideHighlightInformation(value: string) {
    this._highlightService.clearHighlight();
    this._highlightService.setHighlightedBlock(value);
  }

  /**
   * When the currentCodeResource changes, the values from the aiCoach need a reset
   */
  reset() {
    this.aiHint$.next(null);
    this._highlightService.clearHighlight();
    this.aiCoachState$.next("neutral");
    this.suggestedHole$.next;
  }
  /**
   * Unsubscribe when the component is destroyed
   * TODO: Does this ever happen in case of a service?
   */
  ngOnDestroy() {
    this._subscriptions.unsubscribe();
  }
}
