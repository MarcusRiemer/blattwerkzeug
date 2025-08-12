import { BehaviorSubject, Observable, combineLatest } from "rxjs";
import { map, shareReplay, switchMap, tap } from "rxjs/operators";

import { ProjectResource } from "../resource";
import { ResourceReferencesService } from "../resource-references.service";

import { CodeResourceDescription } from "./coderesource.description";
import { SyntaxTree, NodeDescription, NodeLocation } from "./syntaxtree";
import { embraceNode } from "./drop-embrace";
import { BlockLanguage } from "../block/block-language";
import { Validator } from "./validator";

export * from "./coderesource.description";

/**
 * A resource that is described by a syntaxtree.
 *
 * While the tree instance itself is also available via the nodes
 * of the tree, the immutable nature makes it difficult to
 * communicate changes upwards. The resource allows to replace
 * the whole tree and therefore enables mutating operations. So
 * this is additionaly a facade that hides the immutability of the
 * actual tree. If you ever call the mutating operations of the
 * raw Tree instance retrieved by syntaxTree() changes will not
 * be reflected in the code resource.
 */
export class CodeResource extends ProjectResource {
  private _tree$ = new BehaviorSubject<SyntaxTree>(new SyntaxTree(undefined));

  private _runtimeLanguageId$ = new BehaviorSubject<string>(undefined);

  private _blockLanguageId$ = new BehaviorSubject<string>(undefined);

  private _assignment$ = new BehaviorSubject<string>(undefined);

  constructor(
    desc: CodeResourceDescription,
    resourceReferences: ResourceReferencesService
  ) {
    super(desc, resourceReferences);

    this._tree$.next(new SyntaxTree(desc.ast));
    this._runtimeLanguageId$.next(desc.programmingLanguageId);
    this._blockLanguageId$.next(desc.blockLanguageId);
    this._assignment$.next(desc.assignment);
  }

  /**
   * @return The ID of the language this resource uses.
   */
  get runtimeLanguageId() {
    return this._runtimeLanguageId$.value;
  }

  /**
   * @return The assignment of this resource.
   */
  get assignment() {
    return this._assignment$.value;
  }

  /**
   * @return An observable value of the assignment this coderesource uses.
   */
  readonly assignment$: Observable<string> = this._assignment$.asObservable();

  async validatorPeek() {
    const bl = await this.blockLanguagePeek;
    return this.resourceReferences.getValidator(
      this.runtimeLanguageId,
      bl.grammarId
    );
  }

  /**
   * @return The language that is currently in use
   */
  readonly blockLanguage$: Observable<BlockLanguage> =
    this._blockLanguageId$.pipe(
      switchMap((l) => this.resourceReferences.getBlockLanguage(l)),
      shareReplay(1)
    );

  readonly validator$: Observable<Validator> = combineLatest([
    this._runtimeLanguageId$,
    this.blockLanguage$,
  ]).pipe(
    switchMap(([runtimeLangId, b]) =>
      this.resourceReferences.getValidator(runtimeLangId, b.grammarId)
    )
  );

  /**
   * @return The language that is currently in use
   */
  readonly emittedLanguage$ = combineLatest([
    this._runtimeLanguageId$,
    this.blockLanguage$,
  ]).pipe(
    switchMap(([l, b]) =>
      this.resourceReferences.getGrammarProgrammingLanguage(b.grammarId, l)
    )
  );

  /**
   * @param newId The ID of the new emitted language this resource adheres to.
   */
  setRuntimeLanguageId(newId: string) {
    this._runtimeLanguageId$.next(newId);
    this.markSaveRequired();
  }

  /**
   * Sets a new assignment for this resource.
   * @param newAssignment The new assignment to set.
   */
  //TODO: Frage: Lieber mit setAssignment?
  set assignment(newAssignment: string) {
    this._assignment$.next(newAssignment);
    this.markSaveRequired();
  }

  /**
   * @return An observable value of the language this id uses.
   */
  readonly blockLanguageId$: Observable<string> =
    this._blockLanguageId$.asObservable();

  /**
   * @return The ID of the language this resource uses.
   */
  get blockLanguageIdPeek() {
    return this._blockLanguageId$.value;
  }

  get blockLanguagePeek() {
    return this.resourceReferences.getBlockLanguage(this.blockLanguageIdPeek);
  }

  /**
   * @param newId The ID of the new language this resource adheres to.
   */
  setBlockLanguageId(newId: string) {
    this._blockLanguageId$.next(newId);
    this.markSaveRequired();
  }

  /**
   * @return A peek at the tree that describes the code of this resource.
   */
  get syntaxTreePeek(): SyntaxTree {
    return this._tree$.value;
  }

  /**
   * @return The tree that describes the code of this resource.
   */
  readonly syntaxTree$: Observable<SyntaxTree> = this._tree$.asObservable();

  /**
   * Replaces the node at the given location.
   *
   * @param loc The location of the node that should be replaced
   * @param desc The description of the node to put in place
   */
  replaceNode(loc: NodeLocation, desc: NodeDescription) {
    console.log(`Replacing node at ${JSON.stringify(loc)} with`, desc);

    this.replaceSyntaxTree(this.syntaxTreePeek.replaceNode(loc, desc));
  }

  /**
   * Inserts the node at the given location.
   *
   * @param loc The location of the insertion.
   * @param desc The node to insert
   */
  insertNode(loc: NodeLocation, desc: NodeDescription) {
    console.log(`Inserting node at ${JSON.stringify(loc)}`, desc);

    this.replaceSyntaxTree(this.syntaxTreePeek.insertNode(loc, desc));
  }

  /**
   * Embraces the node at the given location.
   *
   * @param loc The location of the insertion.
   * @param desc The node candidates to insert
   *
   * TODO: This method should not do anything "smart", it should just
   *       insert at the only possible location which must be provided
   *       entirely.
   */
  embraceNode(
    validator: Validator,
    loc: NodeLocation,
    desc: NodeDescription[]
  ) {
    console.log(
      `Embracing node at ${JSON.stringify(loc)} with ${desc.length} candidates`,
      desc
    );

    this.replaceSyntaxTree(
      embraceNode(validator, this.syntaxTreePeek, loc, desc)
    );
  }

  /**
   * Deletes the node at the given location.
   *
   * @param loc The location of the insertion.
   */
  deleteNode(loc: NodeLocation) {
    console.log(`Deleting node at ${JSON.stringify(loc)}`);

    this.replaceSyntaxTree(this.syntaxTreePeek.deleteNode(loc));
  }

  /**
   * Sets a new value for a property.
   *
   * @param loc The location of the node to edit.
   * @param key The name of the property.
   * @param value The new value of the property.
   */
  setProperty(loc: NodeLocation, key: string, value: string) {
    console.log(`Setting ${JSON.stringify(loc)} "${key}"="${value}"`);

    this.replaceSyntaxTree(this.syntaxTreePeek.setProperty(loc, key, value));
  }

  /**
   * Adds a new property without specifying a value.
   *
   * @param loc The location of the node to edit.
   * @param key The name of the property.
   */
  addProperty(loc: NodeLocation, key: string) {
    console.log(`Adding ${JSON.stringify(loc)} property "${key}"`);

    this.replaceSyntaxTree(this.syntaxTreePeek.addProperty(loc, key));
  }

  /**
   * Renames the key of a property.
   *
   * @param loc The location of the node to edit.
   * @param key The name of the property.
   * @param newKey The new name of the property.
   */
  renameProperty(loc: NodeLocation, key: string, newKey: string) {
    console.log(
      `Renaming property at ${JSON.stringify(loc)} from "${key}" to "${newKey}"`
    );

    this.replaceSyntaxTree(
      this.syntaxTreePeek.renameProperty(loc, key, newKey)
    );
  }

  /**
   * Adds an empty childgroup to the specified node.
   *
   * @param loc The location of the node to edit.
   * @param key The name of the child group.
   */
  addChildGroup(loc: NodeLocation, key: string) {
    console.log(`Adding empty childgroup "${key}" at ${JSON.stringify(loc)}`);

    this.replaceSyntaxTree(this.syntaxTreePeek.addChildGroup(loc, key));
  }

  /**
   * @param tree The new tree that describes this resource.
   */
  replaceSyntaxTree(tree: SyntaxTree | NodeDescription) {
    if (tree instanceof SyntaxTree) {
      this._tree$.next(tree);
    } else {
      this._tree$.next(new SyntaxTree(tree));
    }
    this.markSaveRequired();
  }

  /**
   * @return The latest generated code for this resource.
   */
  readonly generatedCode$: Observable<string> = combineLatest([
    this.syntaxTree$,
    this.emittedLanguage$,
  ]).pipe(
    map(([tree, lang]) => {
      if (tree && !tree.isEmpty && lang) {
        try {
          return lang.emitTree(tree);
        } catch (e) {
          return e.toString();
        }
      } else {
        return "";
      }
    }),
    shareReplay(1)
  );

  /**
   * @return Serialized description of this code resource.
   */
  toModel(): CodeResourceDescription {
    return {
      id: this.id,
      name: this.name,
      ast: this.syntaxTreePeek.toModel(),
      assignment: this.assignment,
      programmingLanguageId: this.runtimeLanguageId,
      blockLanguageId: this.blockLanguageIdPeek,
    };
  }
}
