import { Injectable } from "@angular/core";

import { BehaviorSubject, Observable, combineLatest } from "rxjs";
import {
  map,
  filter,
  tap,
  shareReplay,
  switchMap,
  first,
} from "rxjs/operators";

import { ResourceReferencesService } from "../shared/resource-references.service";
import {
  CodeResource,
  ErrorCodes,
  NodeDescription,
  NodeLocation,
  NodeLocationStep,
  QualifiedTypeName,
  SyntaxTree,
  ValidationResult,
  Validator,
} from "../shared/syntaxtree";

import { ProjectService } from "./project.service";
import { FixedSidebarBlock } from "../shared/block";

/**
 * This service represents a single code resource that is currently beeing
 * edited. It glues together the actual resource that is beeing edited and
 * enables components like the validator and the compiler to automatically
 * do their work.
 */
@Injectable()
export class CurrentCodeResourceService {
  /**
   * The resource that is currently edited.
   */
  private _codeResource = new BehaviorSubject<CodeResource>(undefined);

  private _executionLocation = new BehaviorSubject<NodeLocation>(undefined);

  private _holeLocation = new BehaviorSubject<NodeLocation>(undefined);

  constructor(
    private _projectService: ProjectService,
    private _resourceReferences: ResourceReferencesService
  ) {}

  /**
   * Allows to change the resource that is currently displayed.
   *
   * @remarks This is meant to be updated in conjunction with the URL.
   */
  _changeCurrentResource(resource: CodeResource) {
    console.log(`Set new resource: "${resource.name}" (${resource.id})`);
    this._codeResource.next(resource);
  }

  /**
   * Informs interested components about the current resource.
   */
  readonly currentResource: Observable<CodeResource> = this._codeResource;

  /**
   * Informs interested components about the tree behind the current resource
   */
  readonly currentTree: Observable<SyntaxTree> = this._codeResource.pipe(
    filter((c) => !!c),
    switchMap((c) => c.syntaxTree$)
  );

  /**
   * The block language that is configured on the resource.
   */
  readonly resourceBlockLanguageId: Observable<string> =
    this.currentResource.pipe(
      filter((c) => !!c),
      switchMap((c) => c.blockLanguageId$)
    );

  readonly blockLanguage$ = this.resourceBlockLanguageId.pipe(
    switchMap((id) => this._resourceReferences.getBlockLanguage(id)),
    shareReplay(1)
  );

  readonly blockLanguageGrammar$ = this.blockLanguage$.pipe(
    switchMap((b) =>
      this._resourceReferences.getGrammarDescription(b.grammarId, {
        onMissing: "throw",
      })
    ),
    shareReplay(1)
  );

  readonly validator$ = combineLatest([
    this.currentResource,
    this.blockLanguage$,
  ]).pipe(
    // Both arguments must be available to have a validator
    filter(([c, b]) => !!c && !!b),
    switchMap(([c, b]) =>
      this._resourceReferences.getValidator(c.runtimeLanguageId, b.grammarId)
    ),
    shareReplay(1)
  );

  /**
   * @return The latest validation result for this resource.
   */
  readonly validationResult = combineLatest([
    this.currentTree,
    this._projectService.activeProject,
    this.validator$,
  ]).pipe(
    map(([tree, project, validator]) => {
      if (tree) {
        return validator.validateFromRoot(
          tree,
          project.additionalValidationContext
        );
      } else {
        return ValidationResult.EMPTY;
      }
    }),
    tap((r) => {
      console.log("CurrentCodeResourceService: Validation result", r);
    })
  );

  /**
   *
   */
  readonly currentExecutionLocation$: Observable<NodeLocation> =
    this._executionLocation.asObservable();

  readonly currentHoleLocation$: Observable<NodeLocation> =
    this._holeLocation.asObservable();

  readonly currentHoleLocationParent$: Observable<NodeLocation> =
    this._holeLocation.pipe(
      map((l) => structuredClone(l).slice(0, l.length - 1)),
      tap((l) => console.log(l)),
      shareReplay(1)
    );
  readonly currentHoleDropStep$: Observable<NodeLocationStep> =
    this._holeLocation.pipe(
      map((l) => l[l.length - 1]),
      shareReplay(1)
    );

  /**
   * The currently loaded resource
   */
  get peekResource() {
    return this._codeResource.value;
  }

  /**
   * The currently edited syntaxtree
   */
  get peekSyntaxtree() {
    return this.peekResource.syntaxTreePeek;
  }

  /**
   * Broadcasts a new execution location.
   */
  setCurrentExecutionLocation(loc?: NodeLocation) {
    this._executionLocation.next(loc);
  }

  setCurrentHoleLocation(loc?: NodeLocation) {
    this._holeLocation.next(loc);
    console.log(`New hole location ${JSON.stringify(loc)}`);
  }

  async currentHoleMatchesBlock(block: NodeDescription | FixedSidebarBlock) {
    const validator = await this.validator$.pipe(first()).toPromise();
    const currentHoleDropStep = await this.currentHoleDropStep$
      .pipe(first())
      .toPromise();
    const currentHoleLocationParent = await this.currentHoleLocationParent$
      .pipe(first())
      .toPromise();
    return this.currentHoleMatchesBlock2(
      block,
      validator,
      currentHoleDropStep,
      currentHoleLocationParent
    );
  }
  currentHoleMatchesBlock2(
    block: NodeDescription | FixedSidebarBlock,
    validator: Validator,
    currentHoleDropStep: NodeLocationStep,
    currentHoleLocationParent: NodeLocation
   ): boolean {
    const ast = this.peekSyntaxtree;

    // TODO 1: Hole location muss parameter sein
    // TODO 2: Es müssen zwei Parameter sein: Parent und drop
    //const holeLocation = structuredClone(this._holeLocation.value);

    if (currentHoleLocationParent != undefined && currentHoleLocationParent.length > 0) {
      //const dropLocation = holeLocation.pop();
      //const parentLocation = holeLocation; //all but last element
      //const dropLocation = holeLocation[holeLocation.length - 1];
      //const parentLocation = holeLocation.slice(0, holeLocation.length - 1);
      //const dropLocation = holeLocation[/*last index of hole location*/ 0];
      //const [...parentLocation, dropLocation] = holeLocation
      const parentNode = ast.locate(currentHoleLocationParent);

      /*console.log("HOLELOCATION", holeLocation);
      console.log("DROPLOCATION", currentDropLocation$);
      console.log("PARENTLOCATION", currentHoleLocationParent$);
      console.log("PARENTNODE", parentNode);*/

      //macht aus dem block ein array, falls dieser noch keins sein sollte
      const fillBlocks =
        block instanceof FixedSidebarBlock
          ? block.tailoredBlockDescription(ast)
          : [block];

      const childBlockTypeName: QualifiedTypeName = {
        typeName: fillBlocks[0].name,
        languageName: fillBlocks[0].language,
      };

      /*const possibleAst = ast.insertNode(
      holeLocation,
      block.tailoredBlockDescription(ast)[0]
    );*/

      //const possibleAst = ast.insertNode(holeLocation, fillBlocks[0]);
      //const insertedNode = possibleAst.locate(holeLocation);

      return validator
        .getGrammarValidator(childBlockTypeName.languageName)
        .getType(parentNode)
        .allowsChildType(childBlockTypeName, currentHoleDropStep[0]);
    } else {
      return true;
    }

    /*URSPRUENGLICHER CODE UM BLÖCKE ZU FILTERN
      wird ersetzt, da es wenig performant und unnötig aufwändig ist jeden Block einzusetzten
      und dann den gesamten Baum zu validieren. So bekomme ich auch alle anderen Fehler im Baum mit,
      die mich zum einsetzten des Blockes eigentlich gar nicht interessieren*/

    /* const allErrors = validator.validateFromRoot(possibleAst);
    const errorList = validator
      .validateFromRoot(possibleAst)
      .errors.filter(
        (error) =>
          error.code == ErrorCodes.IllegalChildType &&
          (error.node === insertedNode ||
            error.node === insertedNode.nodeParent)
      );

    if (errorList.length > 0) {
      console.log("HIEEEER", errorList.length, errorList);
    }

    console.log("DOOOOOOORT", allErrors);

    return errorList.length == 0;*/
  }
}
