import {
  Component,
  ViewChild,
  TemplateRef,
  AfterViewInit,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatLegacyDialog as MatDialog } from "@angular/material/legacy-dialog";

import { ToolbarService } from "../../shared/toolbar.service";
import { MessageDialogComponent } from "../../shared/message-dialog.component";
import { PerformDataService } from "../../shared/authorisation/perform-data.service";
import {
  AffectedResourcesDialogComponent,
  MSG_STORED_SEEDS,
} from "../../shared/affected-resources-dialog.component";

import { EditBlockLanguageService } from "./edit-block-language.service";
import {
  DestroyBlockLanguageGQL,
  SelectionListGrammarsGQL,
  StoreBlockLanguageSeedGQL,
} from "../../../generated/graphql";
import { map } from "rxjs/operators";

@Component({
  templateUrl: "templates/edit-block-language.html",
  providers: [EditBlockLanguageService],
})
export class EditBlockLanguageComponent implements AfterViewInit {
  @ViewChild("toolbarButtons")
  toolbarButtons: TemplateRef<any>;

  constructor(
    private _activatedRoute: ActivatedRoute,
    private _router: Router,
    private _deleteGQL: DestroyBlockLanguageGQL,
    private _storeSeedGQL: StoreBlockLanguageSeedGQL,
    private _matDialog: MatDialog,
    private _current: EditBlockLanguageService,
    private _grammarSelection: SelectionListGrammarsGQL,
    private _toolbarService: ToolbarService,
    private _performData: PerformDataService
  ) {}

  /**
   * All grammars that may be selected for the edited block language.
   */
  readonly availableGrammars = this._grammarSelection
    .watch(
      {},
      { notifyOnNetworkStatusChange: true, fetchPolicy: "network-only" }
    )
    .valueChanges.pipe(map((response) => response.data.grammars.nodes));

  /**
   * A readable version of the grammar that is beeing edited.
   */
  readonly prettyPrintedGrammar = this._current.baseGrammarPrettyPrinted$;

  readonly mayStoreSeed$ = this._current.editedSubjectId$.pipe(
    map((id) => this._performData.blockLanguage.storeSeed(id))
  );

  ngAfterViewInit() {
    this._toolbarService.addItem(this.toolbarButtons);
  }

  get baseGrammarId() {
    return this.editedSubject.grammarId;
  }

  set baseGrammarId(id: string) {
    this._current.doUpdate((bl) => {
      bl.grammarId = id;
    });
  }

  // The block language that is currently beeing edited.
  get editedSubject() {
    return this._current.editedSubject;
  }

  // All errors that occured during generation
  get generatorErrors() {
    return this._current.generatorErrors;
  }

  // The pretty printed version of the block language
  get prettyPrintedBlockLanguage() {
    return this._current.prettyPrintedBlockLanguage;
  }

  /**
   * The user wants to add a new root CSS class
   */
  onAddCssRootClass(className: string) {
    if (!className) {
      return;
    }

    this._current.doUpdate((bl) => {
      if (!bl.rootCssClasses) {
        bl.rootCssClasses = [];
      }

      // Ensure no class is added twice
      if (!new Set(bl.rootCssClasses).has(className)) {
        bl.rootCssClasses.push(className);
      }
    });
  }

  /**
   * The user wants to remove a certain root css clas
   */
  onRemoveCssRootClass(className: string) {
    this._current.doUpdate((bl) => {
      bl.rootCssClasses = bl.rootCssClasses.filter((c) => c !== className);
    });
  }

  /**
   * Reruns the block language generator.
   */
  onRegenerate() {
    this._current.regenerate();
  }

  /**
   * Saves the current state of the block language
   */
  async onSave() {
    const result = await this._current.save();
    const errors = result.data?.updateBlockLanguage?.errors;
    if (errors?.length > 0) {
      console.error(errors);
      alert(`${errors.length} errors during saving, see development console`);
    }
  }

  /**
   * User has decided to delete.
   */
  async onDelete() {
    const confirmed = await MessageDialogComponent.confirm(this._matDialog, {
      description: $localize`:@@message.ask-delete-resource:Soll diese Resource wirklich gelöscht werden?`,
    });

    if (confirmed) {
      await this._deleteGQL.mutate({ id: this.editedSubject.id }).toPromise();
      this._router.navigate([".."], { relativeTo: this._activatedRoute });
    }
  }

  async onStoreSeed() {
    const result = await this._storeSeedGQL
      .mutate({
        blockLanguageIds: [this.editedSubject.id],
      })
      .toPromise();

    AffectedResourcesDialogComponent.show(
      this._matDialog,
      result.data.storeBlockLanguageSeed.affectedIds[0],
      MSG_STORED_SEEDS
    );
    console.log(result);
  }

  /**
   * The data for the generator has been updated.
   */
  onGeneratorDataUpdate(json: any) {
    this._current.updateGeneratorData(json);
  }

  /**
   * Wrapper for checkbox style operations for CSS root classes
   */
  static RootCssClass = class {
    constructor(
      readonly name: string,
      private readonly _parent: EditBlockLanguageComponent
    ) {}

    get checked() {
      return this._parent.editedSubject?.rootCssClasses?.includes(this.name);
    }

    set checked(v: boolean) {
      if (v) {
        this._parent.onAddCssRootClass(this.name);
      } else {
        this._parent.onRemoveCssRootClass(this.name);
      }
    }
  };

  readonly availableCssRootClasses = [
    new EditBlockLanguageComponent.RootCssClass("activate-block-outline", this),
    new EditBlockLanguageComponent.RootCssClass("activate-keyword", this),
    new EditBlockLanguageComponent.RootCssClass("activate-comment", this),
  ];
}
