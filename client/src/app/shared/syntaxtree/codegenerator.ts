import { BlattWerkzeugError } from "../blattwerkzeug-error";
import { codeGeneratorFromGrammar } from "./codegenerator-automatic";
import { prettierCodeGeneratorFromGrammar } from "./codegenerator-prettier";
import { CodeGeneratorProcess, NodeConverter } from "./codegenerator-process";
import { NamedLanguages, VisualisedLanguages } from "./grammar.description";
import { SyntaxNode, SyntaxTree, QualifiedTypeName } from "./syntaxtree";

/**
 * Used to register a NodeConverter for a certain type.
 */
export interface NodeConverterRegistration {
  converter: NodeConverter<any>;
  type: QualifiedTypeName;
}

/**
 * Registers callbacks per language per type.
 */
export type RegisteredCodeGenerators = {
  [langName: string]: { [typeName: string]: NodeConverter<any> };
};

/**
 * Transforms an AST into its compiled string representation.
 */
export class CodeGenerator {
  private _callbacks: RegisteredCodeGenerators = {};
  private _state?: any;

  constructor(
    /**
     * Explicit converters defined by typescript code
     */
    converters: NodeConverterRegistration[],
    /**
     * Implicitly written converters defined by grammar visualisations
     */
    private readonly types: NamedLanguages | VisualisedLanguages = {},
    /**
     * Add possibility to opt out of prettier code generation
     */
    private readonly algorithm: "legacy" | "prettier" = "prettier",
    state: any[] = []
  ) {
    // Merge all the given states into a single object
    this._state = Object.assign({}, ...state);

    // Remember every explicit converter
    converters.forEach((c) => this.registerConverter(c.type, c.converter));
  }

  /**
   * Registers a new converter for a certain type. Currently
   * duplicate converters are not allowed, so it is not possible
   * to unintentionally overwrite already registered convertes.
   */
  private registerConverter(
    t: QualifiedTypeName,
    converter: NodeConverter<any>
  ) {
    if (this.hasExplicitConverter(t)) {
      throw new BlattWerkzeugError(
        `There is already a converter for "${t.languageName}.${t.typeName}"`
      );
    } else {
      if (!this._callbacks[t.languageName]) {
        this._callbacks[t.languageName] = {};
      }
      this._callbacks[t.languageName][t.typeName] = converter;
    }
  }

  /**
   * @param ast The tree to emit.
   */
  emit(ast: SyntaxNode | SyntaxTree): string {
    let rootNode: SyntaxNode = undefined;

    if (ast instanceof SyntaxTree && !ast.isEmpty) {
      rootNode = ast.rootNode;
    } else if (ast instanceof SyntaxNode) {
      rootNode = ast;
    }

    if (rootNode) {
      if (
        this.algorithm === "legacy" ||
        Object.keys(this._callbacks).length > 0
      ) {
        // Make a deep copy of the given state
        const stateCopy = JSON.parse(JSON.stringify(this._state));
        const process = new CodeGeneratorProcess(this, stateCopy);
        process.generateNode(rootNode);

        return process.emit();
      } else {
        return prettierCodeGeneratorFromGrammar(this.types, rootNode);
      }
    } else {
      throw new Error("Attempted to generate code for empty tree");
    }
  }

  /**
   * @return True if there is a converter for the given type.
   */
  hasExplicitConverter(t: QualifiedTypeName) {
    return !!(
      this._callbacks[t.languageName] &&
      this._callbacks[t.languageName][t.typeName]
    );
  }

  /**
   * @return True, if it would be possible to implicitly generate
   *         something for the given type.
   */
  hasImplicitConverter(t: QualifiedTypeName) {
    return !!this.types?.[t.languageName]?.[t.typeName];
  }

  /**
   * @return A converter for the type in question.
   */
  getConverter(t: QualifiedTypeName): NodeConverter<any> {
    let err: BlattWerkzeugError | undefined = undefined;

    if (!this._callbacks[t.languageName]) {
      err = new BlattWerkzeugError(
        `Language "${
          t.languageName
        }" is unknown to CodeGenerator, available languages are: [${Object.keys(
          this._callbacks
        ).join(", ")}]`
      );
    }

    if (!err && !this._callbacks[t.languageName][t.typeName]) {
      err = new BlattWerkzeugError(
        `Type "${t.languageName}.${t.typeName}" is unknown to CodeGenerator`
      );
    }

    // Try to return an implicit converter if there has been an error
    if (err) {
      if (this.hasImplicitConverter(t)) {
        return {
          init: (node: SyntaxNode, process: CodeGeneratorProcess<any>) =>
            codeGeneratorFromGrammar(this.types, node, process),
        };
      } else {
        throw err;
      }
    } else {
      return this._callbacks[t.languageName][t.typeName];
    }
  }
}
