import { NodeConverterRegistration } from "./codegenerator";
import { SyntaxTree, NodeDescription, QualifiedTypeName } from "./syntaxtree";
import { Validator, SubValidator } from "./validator";
import { ValidationResult } from "./validation-result";
import { CodeGenerator } from "./codegenerator";
import { GrammarDescription } from "./grammar.description";
import { allVisualisableTypes } from "./grammar-type-util";

/**
 * Ties together non-moving parts of everything the editor needs to work
 * with a language.
 */
export interface LanguageDefinition {
  id: string;
  name: string;
  validators: SubValidator[];
  emitters: NodeConverterRegistration[];
  codeGeneratorState?: any[];
}

/**
 * A facade that ties together everything the editor needs to work with a language.
 */
export class Language {
  /**
   * The ID of the core programming language that is represented.
   */
  readonly programmingLanguageId: string;

  /**
   * Possibly the grammar that this language is based on.
   */
  readonly grammarId?: string;

  /**
   * @return The name of this language.
   */
  readonly name: string;

  /**
   * @return The validator that is assoicated with this language
   */
  readonly validator: Validator;

  readonly codeGenerator: CodeGenerator;

  readonly codeEmitters: NodeConverterRegistration[];

  constructor(desc: LanguageDefinition, g?: GrammarDescription) {
    this.programmingLanguageId = desc.id;
    this.name = desc.name;
    this.codeEmitters = desc.emitters;
    this.grammarId = g?.id;

    this.codeGenerator = new CodeGenerator(
      desc.emitters,
      g ? allVisualisableTypes(g) : {},
      "prettier",
      desc.codeGeneratorState
    );
    this.validator = new Validator([...desc.validators, ...(g ? [g] : [])]);
  }

  /**
   * A new language that uses the exact same custom code assets (code
   * generator, additional validators) but a different grammar.
   */
  cloneWithGrammar(g: GrammarDescription) {
    // Construct a new language that uses a grammar
    return new Language(
      {
        id: this.programmingLanguageId,
        name: this.name,
        emitters: this.codeEmitters,
        validators: [...this.validator.specializedValidators],
      },
      g
    );
  }

  /**
   * @return The type with the given name.
   */
  getType(typeName: QualifiedTypeName) {
    return this.validator.getType(typeName.languageName, typeName.typeName);
  }

  /**
   * Instanciate a tree from its description.
   *
   * @param desc The description of the tree
   * @return The described tree
   */
  createTree(desc: NodeDescription): SyntaxTree {
    return new SyntaxTree(desc);
  }

  /**
   * Validates a syntax tree against this language.
   *
   * @param ast The root of the tree to validate
   * @param additionalContext
   *   Additional data that may be required by specialized validators. Prime example
   *   is the SQL validator which requires knowledge about the schema.
   * @return A result object containing all errors
   */
  validateTree(ast: SyntaxTree, additionalContext: any = {}): ValidationResult {
    return this.validator.validateFromRoot(ast, additionalContext);
  }

  /**
   * Emits the "stringified" version of the given tree.
   *
   * @param ast The root of the tree to generate
   * @return A string representation of the tree.
   */
  emitTree(ast: SyntaxTree): string {
    return this.codeGenerator.emit(ast);
  }

  /**
   * Emits the "stringified" version of the given tree, but with special
   * consideration to represent missing blocks.
   *
   * @param ast The root of the tree to generate
   * @return A string representation of the tree.
   */
  emitTreeWithHoles(ast: SyntaxTree): string {
    return this.codeGenerator.emitWithHoles(ast, this.validator);
  }

  /**
   * @return The validators that are available for this language.
   */
  get availableValidators() {
    return this.validator.availableSchemas;
  }

  /**
   * @return All types that are available in this language.
   */
  get availableTypes() {
    return this.validator.availableTypes;
  }
}
