import { Injectable } from "@angular/core";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Title } from "@angular/platform-browser";
import { MatLegacySnackBar as MatSnackBar } from "@angular/material/legacy-snack-bar";

import { BehaviorSubject } from "rxjs";
import { switchMap, map, filter, pluck, mergeMap } from "rxjs/operators";

import { objectOmit } from "../../shared/util";
import { BlockLanguageDescription } from "../../shared/block/block-language.description";
import {
  generateBlockLanguage,
  validateGenerator,
} from "../../shared/block/generator/generator";
import { prettyPrintBlockLanguage } from "../../shared/block/prettyprint";
import { GeneratorError } from "../../shared/block/generator/error.description";
import { prettyPrintGrammar } from "../../shared/syntaxtree";
import { DEFAULT_GENERATOR } from "../../shared/block/generator/generator.description";
import {
  FullGrammarGQL,
  FullBlockLanguageGQL,
  UpdateBlockLanguageGQL,
} from "../../../generated/graphql";

@Injectable()
export class EditBlockLanguageService {
  // The block language that is beeing edited.
  private _editedSubject = new BehaviorSubject<BlockLanguageDescription>(
    undefined
  );

  // All off the current errors
  public generatorErrors: GeneratorError[] = [];

  // The prettyprinted version of the block language
  public prettyPrintedBlockLanguage = "";

  constructor(
    private _singleBlockLanguageGQL: FullBlockLanguageGQL,
    private _updateBlockLanguageGQL: UpdateBlockLanguageGQL,
    private _individualGrammarData: FullGrammarGQL,
    private _activatedRoute: ActivatedRoute,
    private _snackBar: MatSnackBar,
    private _title: Title
  ) {
    // Ensures that a block language that matches the URL is loaded.
    this._activatedRoute.paramMap
      .pipe(
        map((params: ParamMap) => params.get("blockLanguageId")),
        switchMap((id: string) =>
          this._singleBlockLanguageGQL
            .fetch({ id: id }, { fetchPolicy: "network-only" })
            .pipe(pluck("data", "blockLanguage"))
        )
      )
      .subscribe((blockLanguage) => {
        this._editedSubject.next(objectOmit("__typename", blockLanguage));
      });

    // Update the title of the page according to the current language
    this._editedSubject
      .pipe(filter((bl) => !!bl))
      .subscribe((blockLanguage) => {
        this._title.setTitle(
          `BlockLang "${blockLanguage.name}" - Admin - BlattWerkzeug`
        );
        this.prettyPrintedBlockLanguage = prettyPrintBlockLanguage(
          this.editedSubject
        );
      });
  }

  readonly editedSubjectId$ = this._editedSubject.pipe(pluck("id"));

  /**
   * The grammar that is the basis for this block language.
   */
  readonly baseGrammar$ = this._editedSubject.pipe(
    mergeMap((blockLang) =>
      this._individualGrammarData
        .watch({ id: blockLang.grammarId })
        .valueChanges.pipe(pluck("data", "grammar"))
    )
  );

  /**
   * A human readable version of that grammar.
   */
  readonly baseGrammarPrettyPrinted$ = this.baseGrammar$.pipe(
    map((grammar) => prettyPrintGrammar(grammar.name, grammar))
  );

  /**
   * @return The currently edited block language
   */
  get editedSubject(): BlockLanguageDescription {
    return this._editedSubject.value;
  }

  /**
   * Allows to update the currently edited block language and broadcasts the
   * changes afterwards.
   *
   * @param change A callback function that is expected to change the block language.
   */
  doUpdate(
    change: (bl: BlockLanguageDescription) => BlockLanguageDescription | void
  ) {
    // Give the caller a chance to change the root reference
    let changedValue = change(this._editedSubject.value);

    // No return value? Then assume that something was changed inside the reference
    if (!changedValue) {
      changedValue = this._editedSubject.value;
    }
    // That JSON-wrapping and unwrapping is a dirty hack to ensure that the
    // Angular change detector "sees" a new object.
    this._editedSubject.next(JSON.parse(JSON.stringify(changedValue)));
  }

  /**
   * Reruns the block language generator.
   */
  regenerate() {
    // Grab the instructions or assume default instructions
    const instructions =
      this.editedSubject.localGeneratorInstructions || DEFAULT_GENERATOR;

    // Ensure the instructions are valid
    // TODO: Do actual validation again
    this.generatorErrors = []; // await this._schemaValidator.validate("BlockLanguageGeneratorDocument", instructions);

    // And do something meaningful if they are
    if (this.generatorErrors.length === 0) {
      // Fetch the actual grammar that should be used
      this._individualGrammarData
        .fetch({ id: this.editedSubject.grammarId })
        .pipe(pluck("data", "grammar"))
        .subscribe((g) => {
          try {
            this.generatorErrors.push(...validateGenerator(instructions));
          } catch (e) {
            this.generatorErrors.push({
              type: "Unexpected",
              message: "Could not validate block language",
              exception: e,
            });
          }

          if (this.generatorErrors.length === 0) {
            this.doUpdate((blockLanguage) => {
              // Try to generate the block language itself. If this fails something is
              // seriously wrong and we should probably do something smart about it.
              try {
                const updated = Object.assign(
                  {},
                  blockLanguage,
                  generateBlockLanguage(instructions, g)
                );
                // Keep previous root css classes
                updated.rootCssClasses = blockLanguage.rootCssClasses;

                this._snackBar.open(`Regenerated block language`, "", {
                  duration: 3000,
                });
                return updated;
              } catch (e) {
                // Pass on the error
                this.generatorErrors.push({
                  type: "Unexpected",
                  message: "Could not generate block language",
                  exception: e,
                });
                this._snackBar.open(`Could not regenerate block language`);
                // But don't change the language
                return blockLanguage;
              }
            });
          }
        });
    }
  }

  /**
   * Saves the current state of the block language
   */
  async save() {
    return this._updateBlockLanguageGQL.mutate(this.editedSubject).toPromise();
  }

  /**
   * The data for the generator has been updated.
   */
  updateGeneratorData(json: any) {
    this.doUpdate((blockLanguage) => {
      blockLanguage.localGeneratorInstructions = json;
    });
  }
}
