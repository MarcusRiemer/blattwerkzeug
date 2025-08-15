import { Component } from "@angular/core";

import { CurrentCodeResourceService } from "../current-coderesource.service";
import { ErrorCodes, SyntaxTree } from "src/app/shared";
import { first, map, switchMap, withLatestFrom } from "rxjs/operators";
import { DragService } from "../drag.service";
import { BehaviorSubject, Subscription, interval } from "rxjs";
import { DatabaseSchemaService } from "../database-schema.service";
import { FixedBlocksSidebarDescription } from "src/app/shared/block";

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
  private _behaviorSubjectLastDraggedBlock = new BehaviorSubject<any>(null);
  readonly lastDraggedBlock$ =
    this._behaviorSubjectLastDraggedBlock.asObservable();

  constructor(
    private _currentCodeResource: CurrentCodeResourceService,
    private _dragService: DragService,
    private _databaseSchemaService: DatabaseSchemaService
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
   * Receive the current assignment from the code resource.
   */
  readonly assignment$ = this.codeResource$.pipe(
    switchMap((resource) => resource.assignment$)
  );

  /**
   * Receive all database tables with their fields from the database schema service.
   */
  readonly allDatabaseTablesWithFields$ =
    this._databaseSchemaService.currentSchema.pipe(
      map((tables) =>
        tables.map((table) => ({
          name: table.name,
          fields: table.columns.map((column) => column.name),
        }))
      )
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
   * @returns The current block language's blocks with the category names as shown in the sidebar in JSON format.
   */
  async getCurrentBlockLanguageBlocksWithCategoriesJSON() {
    const currentBlockLanguage = await this.currentBlockLanguage$
      .pipe(first())
      .toPromise();

    const currentBlockLanguageIndex =
      currentBlockLanguage.sidebarDesriptions.findIndex(
        (c) => c.type === "fixedBlocks"
      );

    if (currentBlockLanguageIndex < 0) {
      console.warn(
        "No fixed blocks found in the current block language",
        currentBlockLanguage
      );
      return [];
    }

    const blocksWithCategories = (
      currentBlockLanguage.sidebarDesriptions[
        currentBlockLanguageIndex
      ] as FixedBlocksSidebarDescription
    ).categories.map((category) => ({
      name: category.categoryCaption,
      blocks: category.blocks.map((block) => ({
        name: block.displayName,
      })),
    }));

    return blocksWithCategories;
  }

  /**
   * @returns A prompt that lists all available blocks in the current block language with their categories.
   */
  async getCurrentBlockLanguageBlocksWithCategoriesPrompt() {
    const blocksWithCategoriesJSON =
      await this.getCurrentBlockLanguageBlocksWithCategoriesJSON();

    let prompt = `Ich habe lediglich Zugriff auf die folgenden Code-Blöcke:\n`;
    blocksWithCategoriesJSON.forEach((category) => {
      prompt += `Kategorie: ${category.name}\n`;
      category.blocks.forEach((block) => {
        prompt += `- ${block.name}\n`;
      });
    });

    return prompt;
  }

  /**
   * @param allTablesWithFieldsJSON An array of all tables with their fields in JSON format.
   * @returns A prompt that lists all available tables for the current task with their fields.
   */
  async getAllTablesWithFieldsPrompt(allTablesWithFieldsJSON: any[]) {
    let prompt = `In meiner Datenbank befinden sich die folgenden Tabellen:\n`;
    allTablesWithFieldsJSON.forEach((table) => {
      prompt += `Tabelle: ${table.name}\n`;
      table.fields.forEach((field) => {
        prompt += `- ${field}\n`;
      });
    });
    return prompt;
  }

  /**
   * Checks if the browser supports the clipboard API.
   */
  readonly hasClipboard = !!navigator.clipboard;

  /**
   * Copies a prompt to the clipboard that can be used to ask for help.
   */
  async copyPromptToClipboard() {
    if (this.hasClipboard) {
      const lastDraggedBlock = await this.lastDraggedBlock$
        .pipe(first())
        .toPromise();

      // Das hat beim Lösen mit der AI nicht so geholfen, daher auskommentiert
      // const numberOfErrors = await this.errors$
      //   .pipe(
      //     map((errors) => errors.length),
      //     first()
      //   )
      //   .toPromise();

      const allTablesWithFieldsJSON = await this.allDatabaseTablesWithFields$
        .pipe(first())
        .toPromise();

      const availableBlocksPrompt =
        await this.getCurrentBlockLanguageBlocksWithCategoriesPrompt();

      const countHoles = await this.countHoles$.pipe(first()).toPromise();

      const generatedCode = await this.generatedCode$.pipe(first()).toPromise();

      let prompt = `Nimm die Rolle eines Lehrers ein und hilf mir bei folgender Aufgabe. Das Ziel ist es am Ende einen fertigen Codeabschnitt zu haben, der die Aufgabe erfüllt.`;

      if (this.assignment$) {
        const task = await this.assignment$.pipe(first()).toPromise();
        prompt += `Meine Aufgabe lautet: ${task}\n`;
      }

      prompt += `Ich möchte nun dafür diesen Code vervollständigen:\n${generatedCode}\n`;

      if (lastDraggedBlock) {
        const lastDraggedBlockCode = await this.getCodeForLastDraggedBlock(
          lastDraggedBlock
        );
        prompt += `Dafür habe ich zuletzt diesen Codeabschnitt genutzt: \n${lastDraggedBlockCode}\n`;
      }
      // if (numberOfErrors > 0) {
      //   prompt += `Dabei werden mir ${numberOfErrors} Fehler angezeigt.\n`;
      // }

      if (countHoles > 0) {
        prompt += `Dabei habe ich ${countHoles} Löcher in meinem Code, die ich noch füllen muss.\n`;
      }
      prompt +=
        `Hier noch ein paar Infos zu dem Kontext:\n${availableBlocksPrompt}\n${await this.getAllTablesWithFieldsPrompt(
          allTablesWithFieldsJSON
        )}
        Für deine Antworten gelten folgende Regeln:
        Bei Join Operationen wird der Code-Block INNER JOIN ON präferiert. 
        Bitte gib mir Feedback zu meinem aktuellen Code und wie ich weitermachen sollte, aber gib mir aber nicht die Lösung vor, sondern nur Hinweise.
        Halte deine Antwort so kurz wie möglich und konzentriere dich auf den nächsten Code-Block, den ich nutzen sollte.
        
        Bitte nenne mir wirklich nur einen einzigen nächsten Code-Block, den ich als Nächstes einsetzen sollte – nicht mehr.
        Bitte nenne mir nur Code-Blöcke, die ich zur Verfügung habe. Tabellen oder Tabellenspalten zählen auch jeweils als ein Code-Block.
        Überlege auch bitte gründlich, ob der Code vielleicht sogar schon vollständig ist.
        WICHTIG: Die COUNT()-Funktionen mit leeren Klammern sind bereits korrekt implementiert und sollen nicht kommentiert werden.`.replace(
          /^[ \t]+/gm,
          ""
        );

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
