import {
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { Title } from "@angular/platform-browser";

import { Subscription, BehaviorSubject } from "rxjs";

import { switchMap, map, pluck } from "rxjs/operators";

import {
  FullGrammarGQL,
  DestroyGrammarGQL,
  UpdateGrammarGQL,
  RegenerateForeignTypesGQL,
} from "../../../generated/graphql";

import { ToolbarService } from "../../shared/toolbar.service";
import { prettyPrintGrammar } from "../../shared/syntaxtree/prettyprint";
import { QualifiedTypeName, GrammarDescription } from "../../shared/syntaxtree";
import {
  getTypeList,
  allConcreteTypes,
} from "../../shared/syntaxtree/grammar-type-util";
import { BlockLanguageDescription } from "../../shared/block/block-language.description";

@Component({
  templateUrl: "templates/edit-grammar.html",
})
export class EditGrammarComponent implements OnInit, OnDestroy {
  @ViewChild("toolbarButtons", { static: true })
  toolbarButtons: TemplateRef<any>;

  // The grammar that is beeing edited
  grammar: GrammarDescription;

  subscriptions: Subscription[] = [];

  // Block languages that are related to this grammar
  relatedBlockLanguages: Pick<BlockLanguageDescription, "id" | "name">[];

  // All types that are available as root. These may not be regenerated
  // on the fly because [ngValue] uses the identity of the objects to compare them.
  availableTypes: QualifiedTypeName[] = [];

  readonly grammarReferences$ = new BehaviorSubject<{ grammarId: string }[]>(
    []
  );

  constructor(
    private _activatedRoute: ActivatedRoute,
    private _router: Router,
    private _title: Title,
    private _toolbarService: ToolbarService,
    private _updateGrammarGQL: UpdateGrammarGQL,
    private _destroyGrammarGQL: DestroyGrammarGQL,
    private _editGrammarGQL: FullGrammarGQL,
    private _regenerateGrammar: RegenerateForeignTypesGQL
  ) {}

  //TODO: Related Blocklanguages are still in cache after they were deleted.

  ngOnInit() {
    // Grab the first grammar from the server or the local cache. The grammar must not
    // be updated if re-requested from the server by someone else.
    this._activatedRoute.paramMap
      .pipe(
        map((params: ParamMap) => params.get("grammarId")),
        switchMap(
          (id: string) =>
            this._editGrammarGQL.watch(
              { id },
              { notifyOnNetworkStatusChange: true, fetchPolicy: "network-only" }
            ).valueChanges
        ),
        pluck("data", "grammar")
      )
      .subscribe((g) => {
        // The response object contains additional properties that
        // we don't expect.
        this.grammar = JSON.parse(JSON.stringify(g));
        delete this.grammar["blockLanguages"];

        this.availableTypes = getTypeList(allConcreteTypes(this.grammar));
        this.grammarRoot = this.grammar.root;
        this._title.setTitle(
          `Grammar "${this.grammar.name}" - Admin - BlattWerkzeug`
        );
        this.relatedBlockLanguages = g.blockLanguages;
        if (this.grammar.generatedFromId === null) {
          this.grammar.generatedFromId = undefined;
        }

        const grammarRefs = () => {
          const all = [
            ...(this.grammar?.includes ?? []),
            ...(this.grammar?.visualizes ?? []),
          ];

          return all.map((grammarId) => {
            return {
              grammarId,
            };
          });
        };

        this.grammarReferences$.next(grammarRefs());
      });
    // Setup the toolbar buttons
    this._toolbarService.addItem(this.toolbarButtons);
  }

  ngOnDestroy(): void {
    for (let sub of this.subscriptions) {
      if (sub && sub.unsubscribe) {
        sub.unsubscribe();
      }
    }
  }

  /**
   * User has decided to save.
   */
  onSave() {
    const mutationSubscription = this._updateGrammarGQL
      .mutate(this.grammar)
      .subscribe();
    this.subscriptions = [...this.subscriptions, mutationSubscription];
  }

  get grammarRoot() {
    return this.grammar.root;
  }

  /**
   * Ensures that the instance of the qualified typename matches an instance in availableTypes.
   * This allows ngModel to pre-select the correct value.
   */
  set grammarRoot(t: QualifiedTypeName) {
    if (!!t) {
      this.grammar.root = this.availableTypes.find(
        (a) => a.languageName === t.languageName && a.typeName === t.typeName
      );
    } else {
      this.grammar.root = undefined;
    }
  }

  get grammarTypes() {
    return this.grammar.types;
  }

  /**
   * Updates the types that are available when set.
   */
  set grammarTypes(types) {
    this.grammar.types = types;
    this.availableTypes = getTypeList(allConcreteTypes(this.grammar));
    this.grammarRoot = this.grammar.root;
  }

  /**
   * User has decided to delete.
   */
  async onDelete() {
    await this._destroyGrammarGQL.mutate({ id: this.grammar.id }).toPromise();
    this._router.navigate([".."], { relativeTo: this._activatedRoute });
  }

  async onRegenerateForeignTypes() {
    const response = await this._regenerateGrammar
      .mutate({
        id: this.grammar.id,
      })
      .toPromise();

    this.grammar.foreignTypes =
      response.data.regenerateForeignTypes.grammar.foreignTypes;
  }

  /**
   * The compiled version of the grammar
   */
  get prettyPrintedGrammar() {
    try {
      return prettyPrintGrammar(this.grammar.name, this.grammar);
    } catch (e) {
      return e.message;
    }
  }
}
