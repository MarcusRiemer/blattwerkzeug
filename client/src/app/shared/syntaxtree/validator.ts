import * as Desc from './validator.description'
import * as AST from './syntaxtree'

export enum ErrorCodes {
  UnknownRoot = "UNKNOWN_ROOT",
  UnexpectedType = "UNEXPECTED_TYPE",
  IllegalChildType = "ILLEGAL_CHILD_TYPE",
}

interface ValidationError {
  code: string;
  node: AST.Node;
}

/**
 * Used during validation to accumulate validation results.
 */
class ValidationContext {
  private _errors: ValidationError[] = [];

  addError(code: ErrorCodes | string, node: AST.Node) {
    this._errors.push({ code: code, node: node });
  }

  get errors() {
    return (this._errors);
  }
}

/**
 * Represents the result of a completed validation.
 */
export class ValidationResult {
  private _errors: ValidationError[];

  constructor(context: ValidationContext) {
    this._errors = context.errors;
  }

  get isValid() {
    return (this._errors.length === 0);
  }

  get errors() {
    return (this._errors);
  }
}


/**
 * Base class for types describing simple and complex nodes. Derived
 * instances of this class are registered as part of a schema.
 */
abstract class NodeType {
  private _familyName: string;
  private _typeName: string;

  constructor(typeDesc: Desc.NodeTypeDescription, language: string) {
    this._typeName = typeDesc.nodeName;
    this._familyName = language;
  }

  /**
   * @return The name of the language this type belongs to.
   */
  get languageName() {
    return (this._familyName);
  }

  /**
   * @return The type of node this instance will validate.
   */
  get typeName() {
    return (this._typeName);
  }

  /**
   * Validates this node and (if applicable) it's children
   * and other properties.
   */
  validate(ast: AST.Node, context: ValidationContext) {
    // Does the type of the given node match the type we expect?
    if (this._familyName == ast.nodeFamily && this._typeName == ast.nodeName) {
      context.addError(ErrorCodes.UnexpectedType, ast);
    } else {
      // Further validation is done by specific implementations
      this.validateImpl(ast, context);
    }
  }

  abstract validateImpl(ast: AST.Node, context: ValidationContext);
}

/**
 * Describes a complex node that may have any kind of children.
 */
class NodeComplexType extends NodeType {
  private _allowedChildren: { [category: string]: NodeComplexTypeChildren } = {};

  constructor(typeDesc: Desc.NodeTypeDescription, familyName: string) {
    super(typeDesc, familyName)

    if (Desc.isNodeComplexTypeDescription(typeDesc)) {
      // Construct validators for all children
      const childrenCategories = typeDesc.childrenCategories || [];
      childrenCategories.forEach(groupDesc => {
        this._allowedChildren[groupDesc.categoryName] = new NodeComplexTypeChildren(groupDesc);
      });
    } else {
      throw new Error("Wrong type description: Not complex");
    }
  }

  /**
   * Validates this node itself and all existing children.
   */
  validateImpl(ast: AST.Node, context: ValidationContext) {
    // Iterate over all children the node has
    Object.entries(ast.children).forEach(([category, nodes]) => {
      // Ensure there is a validator for that category
      if (this._allowedChildren[category]) {
        this._allowedChildren[category].validate(nodes, context);
      } else {
        throw new Error("Not implemented");
      }
    });
  }
}

/**
 * Validates children of a complex type.
 */
class NodeComplexTypeChildren {
  private _categoryName: string;

  private _childValidator: NodeComplexTypeChildrenValidator;

  constructor(desc: Desc.NodeComplexTypeChildrenGroupDescription) {
    this._categoryName = desc.categoryName;

    const validatorDesc = desc.children;
    if (Desc.isNodeTypesSequenceDescription(validatorDesc)) {
      this._childValidator = new NodeComplexTypeChildrenSequence(validatorDesc);
    } else if (Desc.isNodeTypesAllowedDescription(validatorDesc)) {
      this._childValidator = new NodeComplexTypeChildrenAllowed(validatorDesc);
    } else {
      throw new Error(`Unknown child validator: "${JSON.stringify(desc)}"`);
    }
  }

  /**
   * Checks the children of this group.
   */
  validate(ast: AST.Node[], context: ValidationContext) {
    // Check the top-level structure of the children
    const validChildren = this._childValidator.validateChildren(ast, context);

    // Check the children themselves
  }
}


/**
 * Classes implementing this interface can check whether certain
 * child nodes are structurally valid.
 */
interface NodeComplexTypeChildrenValidator {
  /**
   * Checks whether the given children are in a legal position in the given
   * array. Adds errors to the context if children are in illegal positions.
   *
   * @return All children that are in valid positions and should be checked further.
   */
  validateChildren(ast: AST.Node[], context: ValidationContext): AST.Node[];
}

/**
 * Enforces a specific sequence of child-nodes of a parent node.
 */
class NodeComplexTypeChildrenSequence implements NodeComplexTypeChildrenValidator {
  private _nodeTypes: string[];

  constructor(desc: Desc.NodeTypesSequenceDescription) {
    this._nodeTypes = desc.nodeTypes;
  }

  validateChildren(ast: AST.Node[], context: ValidationContext): AST.Node[] {
    throw new Error("Not implemented");
  }
}

/**
 * Ensures that every child-node is of a type that has been explicitly
 * whitelisted.
 */
class NodeComplexTypeChildrenAllowed implements NodeComplexTypeChildrenValidator {
  private _nodeTypes: string[];

  constructor(desc: Desc.NodeTypesAllowedDescription) {
    this._nodeTypes = desc.nodeTypes;
  }

  /**
   * Ensures that every child has at least a matching type.
   */
  validateChildren(children: AST.Node[], context: ValidationContext) {
    const toReturn: AST.Node[] = [];

    children.forEach(node => {
      if (!this._nodeTypes.find(type => node.nodeName === type)) {
        context.addError(ErrorCodes.IllegalChildType, node);
      } else {
        toReturn.push(node);
      }
    });

    return (toReturn);
  }
}

/**
 * Types are usually not embedded, but referenced. This class is able
 * to resolve those references, even (or especially) if they cross
 * language boundaries.
 */
class TypeReference {
  private _languageName: string;
  private _typeName: string;
  private _validator: Validator;

  constructor(_validator: Validator, desc: Desc.TypeReference, currentLang: string) {
    this._validator = _validator;

    if (Desc.isQualifiedTypeReference(desc)) {
      this._languageName = desc.languageName;
      this._typeName = desc.typeName;
    } else {
      this._languageName = currentLang;
      this._typeName = desc;
    }
  }

  /**
   * @return True if this reference can be resolved to a "proper" type.
   */
  get isResolveable() {
    return (this._validator.isKnownType(this._languageName, this._typeName));
  }

  get type() {
    if (!this.isResolveable) {
      throw new Error(`Could not resolve type "${this._languageName}.${this._typeName}"`);
    } else {
      return (this._validator.getType(this._languageName, this._typeName));
    }
  }
}

/**
 * A language consists of type definitions and a set of types that may occur at the root.
 */
class Language {
  private _validator: Validator;
  private _languageName: string;
  private _registeredTypes: { [name: string]: NodeComplexType } = {};
  private _rootTypes: TypeReference[] = [];

  constructor(validator: Validator, desc: Desc.LanguageDescription) {
    this._validator = validator;
    this._languageName = desc.languageName;

    desc.types.forEach(typeDesc => this.registerTypeValidator(typeDesc));
    this._rootTypes = desc.root.map(rootDesc => new TypeReference(validator, rootDesc, this._languageName));
  }

  validateFromRoot(ast: AST.Node, context: ValidationContext) {
    const rootType = this._rootTypes.find(rootRef => rootRef.type.typeName == ast.nodeName);

    if (!rootType) {
      context.addError(ErrorCodes.UnknownRoot, ast);
    } else {
      rootType.type.validate(ast, context);
    }
  }

  /**
   * @return True if the given typename is known in this language.
   */
  isKnownType(typename: string) {
    return (!!this._registeredTypes[typename]);
  }

  getType(typename: string) {
    if (!this.isKnownType(typename)) {
      throw new Error(`Language "${this._languageName}" does not have type "${typename}"`);
    } else {
      return (this._registeredTypes[typename]);
    }
  }

  /**
   * Registers a new type validator with this language.
   */
  private registerTypeValidator(desc: Desc.NodeTypeDescription) {
    if (this.isKnownType(desc.nodeName)) {
      throw new Error(`Attempted to register node "${desc.nodeName}" twice for "${this._languageName}. Previous definition: ${JSON.stringify(this._registeredTypes[desc.nodeName])}, Conflicting Definition: ${JSON.stringify(desc)}`);
    }

    this._registeredTypes[desc.nodeName] = new NodeComplexType(desc, this._languageName);
  }

  /**
   * Registers a new possible root with this language.
   */
  private registerRootReference(desc: Desc.TypeReference) {
    this._rootTypes.push(new TypeReference(this._validator, desc, this._languageName));
  }
}

/**
 * A validator receives instances of one or multiple schemas and will
 * check any AST against those languages.
 */
export class Validator {
  private _registeredLanguages: { [langName: string]: Language } = {};

  constructor(langs: Desc.LanguageDescription[]) {
    langs.forEach(langDesc => this.registerLanguage(langDesc));
  }

  registerLanguage(desc: Desc.LanguageDescription) {
    if (this.isKnownLanguage(desc.languageName)) {
      throw new Error(`Attempted to register language "${desc.languageName}" twice`);
    }

    this._registeredLanguages[desc.languageName] = new Language(this, desc);
  }

  validateFromRoot(ast: AST.Node) {
    const lang = this.getLanguage(ast.nodeFamily);
    const context = new ValidationContext();

    lang.validateFromRoot(ast, context);

    return (new ValidationResult(context));
  }

  getLanguage(language: string) {
    if (!this.isKnownLanguage(language)) {
      throw new Error(`Validator does not know language "${language}"`);
    } else {
      return (this._registeredLanguages[language]);
    }
  }

  getType(language: string, typename: string) {
    if (!this.isKnownType(language, typename)) {
      throw new Error(`Validator does not know type "${language}.${typename}"`);
    } else {
      return (this._registeredLanguages[language].getType(typename));
    }
  }

  /**
   * @return True if the given language is known to this validator.
   */
  isKnownLanguage(language: string) {
    return (!!this._registeredLanguages[language]);
  }

  /**
   * @return True if the given typename is known in the given language.
   */
  isKnownType(language: string, typename: string) {
    return (
      this.isKnownLanguage(language) &&
      this._registeredLanguages[language].isKnownType(typename)
    );
  }
}
