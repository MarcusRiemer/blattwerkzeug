import * as Desc from "./grammar.description";
import * as AST from "./syntaxtree";

import { Validator } from "./validator";
import {
  ErrorCodes,
  ValidationContext,
  ErrorMissingChild,
  ErrorMissingProperty,
  ErrorUnexpectedType,
  ErrorIllegalChildType,
  ErrorSuperflousChild,
} from "./validation-result";

import { resolveChildOccurs } from "./grammar-util";
import { OccursSpecificDescription, resolveOccurs } from "./occurs";
import { QualifiedTypeName } from "./syntaxtree.description";
import { allConcreteTypes } from "./grammar-type-util";
import { isValidId } from "../util";

/**
 * Every type can be identified by its fully qualified name (language
 * & name) and has access to the validator instance this concrete
 * type was loaded into.
 */
export abstract class NodeType {
  private _languageName: string;
  private _typeName: string;
  private _validator: Validator;

  constructor(validator: Validator, language: string, name: string) {
    this._typeName = name;
    this._languageName = language;
    this._validator = validator;
  }

  /**
   * Takes a node of an AST and validates the node itself and possibly
   * its children. Errors are collected in the given ValidationContext.
   *
   * @param ast The part of the tree that needs to be validated.
   * @param context Collects errors, hints, ... during validation.
   */
  abstract validate(ast: AST.SyntaxNode, context: ValidationContext): void;

  /**
   * @return True if this instance could be used to validate something
   *         of the given type.
   */
  matchesType(typeName: AST.QualifiedTypeName) {
    return (
      this._languageName == typeName.languageName &&
      this._typeName == typeName.typeName
    );
  }

  /**
   * @return The name of the language this type belongs to.
   */
  get languageName() {
    return this._languageName;
  }

  /**
   * @return The type of node this instance will validate.
   */
  get typeName() {
    return this._typeName;
  }

  /**
   * @return The fully qualified typename this validator expects.
   */
  get qualifiedName(): AST.QualifiedTypeName {
    return {
      languageName: this._languageName,
      typeName: this._typeName,
    };
  }

  /**
   * @return The validator this node is associated with.
   */
  get validator() {
    return this._validator;
  }

  /**
   * Determines whether the given type would be an *immediate* fit in the
   * given category. This check does *not* care about any possible errors
   * that would occur in the node of the given type. This partial check is
   * useful to determine "sort of" legal drag targets.
   *
   * @param childType The type that is possible added.
   * @param categoryName The name of the category in question.
   *
   * @return True, if this would be a legal, immediate fit.
   */
  abstract allowsChildType(
    childType: AST.QualifiedTypeName,
    categoryName: string
  ): boolean;

  /**
   * Valid amounts of children inside a certain category.
   */
  abstract validCardinality(categoryName: string): OccursSpecificDescription;

  /**
   * These names are valid child categories
   */
  abstract get allowedChildrenCategoryNames(): string[];

  /**
   * These names are valid properties.
   */
  abstract get allowedPropertyNames(): string[];
}

/**
 * Describes a complex node that may have any kind of children.
 */
export class NodeConcreteType extends NodeType {
  // Possible child groups of this type
  private _allowedChildren: { [category: string]: NodeTypeChildren } = {};

  // Possible properties of this type
  private _allowedProperties: {
    [propName: string]: NodePropertyValidator;
  } = {};

  constructor(
    validator: Validator,
    typeDesc: Desc.NodeConcreteTypeDescription,
    language: string,
    name: string
  ) {
    super(validator, language, name);
    this.loadAttributes(typeDesc.attributes);
  }

  /**
   * Loads all of the given attributes to be part of this concrete node. Skips over
   * terminal symbols but recursively loads rows.
   */
  private loadAttributes(attr: Desc.NodeAttributeDescription[]) {
    if (attr) {
      // Put the existing attributes into their respective buckets
      attr.forEach((a) => {
        // Visual properties may not have a name
        switch (a.type) {
          case "property":
            if (a.name in this._allowedProperties) {
              throw new Error(`Duplicate property "${a.name}"`);
            }
            this._allowedProperties[a.name] =
              this.instanciatePropertyValidator(a);
            break;
          case "allowed":
          case "sequence":
          case "choice":
          case "parentheses":
            if (a.name in this._allowedChildren) {
              throw new Error(`Duplicate child group "${a.name}"`);
            }
            this._allowedChildren[a.name] = new NodeTypeChildren(
              this,
              a,
              a.name
            );
            break;
          case "container":
            // Consume the children, they may define validation related attributes
            this.loadAttributes(a.children);
            break;
          case "terminal":
          case "interpolate":
            // Do nothing, terminals have no impact on validation
            break;
          default:
            throw new Error(
              `Unknown validator requested: ${JSON.stringify(a)}`
            );
        }
      });
    }
  }

  /**
   * @return The validator for the given property.
   */
  getPropertyType(name: string) {
    return this._allowedProperties[name];
  }

  /**
   * @return Names of all categories that could have children.
   */
  get allowedChildrenCategoryNames() {
    return Object.keys(this._allowedChildren);
  }

  /**
   * @return Names of all properties
   */
  get allowedPropertyNames(): string[] {
    return Object.keys(this._allowedProperties);
  }

  /**
   * @return Cardinality bounds for the given category.
   */
  validCardinality(categoryName: string): OccursSpecificDescription {
    const category = this._allowedChildren[categoryName];
    if (category) {
      return category.validCardinality();
    } else {
      return { maxOccurs: 0, minOccurs: 0 };
    }
  }

  /**
   * Validates this node and (if applicable) it's children
   * and other properties.
   */
  validate(ast: AST.SyntaxNode, context: ValidationContext) {
    // Does the type of the given node match the type we expect?
    if (
      this.languageName == ast.languageName &&
      this.typeName == ast.typeName
    ) {
      // Further validation is done by specific implementations
      this.validateImpl(ast, context);
    } else {
      // Skip any further validation, leave an error
      context.addError(ErrorCodes.UnexpectedType, ast, {
        expected: [this.qualifiedName],
        present: ast.qualifiedName,
      } as ErrorUnexpectedType);
    }
  }

  /**
   * Validates this node itself and all existing children.
   */
  private validateImpl(ast: AST.SyntaxNode, context: ValidationContext) {
    // Check all required children
    this.allowedChildrenCategoryNames.forEach((categoryName) => {
      const catChildren = ast.getChildrenInCategory(categoryName);
      this._allowedChildren[categoryName].validate(ast, catChildren, context);
    });

    // Check that there are no unwanted children
    const requiredCategories = new Set(this.allowedChildrenCategoryNames);
    const superflousCategories = ast.childrenCategoryNames.filter(
      (cat) => !requiredCategories.has(cat)
    );
    superflousCategories.forEach((categoryName) => {
      context.addError(ErrorCodes.SuperflousChildCategory, ast, {
        categoryName: categoryName,
      });
    });

    // Check all required properties
    Object.entries(this._allowedProperties).forEach(([name, validator]) => {
      if (name in ast.properties) {
        // Property exists on the node, time to validate it
        const value = ast.properties[name];
        validator.validate(ast, value, context);
      }
      // Property does not exist, is that a error?
      else if (!validator.isOptional) {
        context.addError(ErrorCodes.MissingProperty, ast, {
          expected: validator.baseName,
          name: name,
        } as ErrorMissingProperty);
      }
    });
  }

  /**
   * @return True if the given type is allowed in the given category.
   */
  allowsChildType(
    childType: AST.QualifiedTypeName,
    categoryName: string
  ): boolean {
    const category = this._allowedChildren[categoryName];
    return !!(category && category.allowsChildType(childType));
  }

  /**
   * @return A NodePropertyValidator that validates the correct type.
   */
  private instanciatePropertyValidator(
    desc: Desc.NodePropertyTypeDescription
  ): NodePropertyValidator {
    switch (desc.base) {
      case "boolean":
        return new NodePropertyBooleanValidator(desc);
      case "string":
        return new NodePropertyStringValidator(desc);
      case "integer":
        return new NodePropertyIntegerValidator(desc);
      case "codeResourceReference":
      case "grammarReference":
        return new NodePropertyReferenceValidator(desc);
      default:
        // @ts-ignore `base` is technically never, but we want clean errors for non-conforming inputs
        throw new Error(`Unknown property validator for base "${desc.base}"`);
    }
  }
}

/**
 * Creates a validator that matches the type of the given description.
 *
 * @param desc The description of the child group validator
 * @return A matching child group validator
 */
function instanciateChildGroupValidator(
  group: NodeTypeChildren,
  desc: Desc.NodeChildrenGroupDescription
) {
  switch (desc.type) {
    case "allowed":
      return new NodeComplexTypeChildrenAllowed(group, desc);
    case "sequence":
      return new NodeComplexTypeChildrenSequence(group, desc);
    case "choice":
      return new NodeComplexTypeChildrenChoice(group, desc);
    case "parentheses":
      return new NodeComplexTypeChildrenParentheses(group, desc);
    default:
      throw new Error(`Unknown child validator: "${JSON.stringify(desc)}"`);
  }
}

/**
 * Validates children of a complex type.
 */
class NodeTypeChildren {
  private _categoryName: string;
  private _childValidator: NodeComplexTypeChildrenValidator;
  private _parent: NodeConcreteType;

  constructor(
    parent: NodeConcreteType,
    desc: Desc.NodeChildrenGroupDescription,
    name: string
  ) {
    this._categoryName = name;
    this._parent = parent;
    this._childValidator = instanciateChildGroupValidator(this, desc);
  }

  /**
   * Checks the given children.
   */
  validate(
    parent: AST.SyntaxNode,
    children: AST.SyntaxNode[],
    context: ValidationContext
  ) {
    // Check the top-level structure of the children
    const validChildren = this._childValidator.validateChildren(
      parent,
      children,
      context
    );

    // Check the children themselves
    validChildren.forEach((child) => {
      const childType = this._parent.validator.getType(
        child.languageName,
        child.typeName
      );
      childType.validate(child, context);
    });
  }

  /**
   * Determines whether the given type would be an *immediate* fit in this
   * category. This check does *not* care about any possible errors that
   * would occur in the node of the given type. This partial check is
   * useful to determine "sort of" legal drag targets.
   *
   * @param childType The type that is possible added.
   *
   * @return True, if this would be a legal, immediate fit.
   */
  allowsChildType(childType: AST.QualifiedTypeName): boolean {
    return this._childValidator.allowsChildType(childType);
  }

  /**
   * Valid amounts of children inside this category
   */
  validCardinality(): OccursSpecificDescription {
    return this._childValidator.validCardinality();
  }

  /**
   * @return The node that is the parent to all of these node.
   */
  get parent() {
    return this._parent;
  }

  /**
   * @return The name of the category these children are attached to.
   */
  get categoryName() {
    return this._categoryName;
  }
}

/**
 * Classes implementing this interface can check whether certain
 * child nodes are structurally valid.
 */
abstract class NodeComplexTypeChildrenValidator {
  /**
   * Delegates further checks to an implementation defined variation
   */
  validateChildren(
    parent: AST.SyntaxNode,
    ast: AST.SyntaxNode[],
    context: ValidationContext
  ): AST.SyntaxNode[] {
    return this.validateChildrenImpl(parent, ast, context);
  }

  /**
   * Checks whether the given children are in a legal position in the given
   * array. Adds errors to the context if children are in illegal positions.
   *
   * @return All children that are in valid positions and should be checked further.
   */
  protected abstract validateChildrenImpl(
    parent: AST.SyntaxNode,
    ast: AST.SyntaxNode[],
    context: ValidationContext
  ): AST.SyntaxNode[];

  /**
   * Determines whether the given type would be an *immediate* fit for this
   * validator. This check does *not* care about any possible errors that
   * would occur in the node of the given type. This partial check is
   * useful to determine "sort of" legal drag targets.
   *
   * @param childType The type that is possible added.
   *
   * @return True, if this would be a legal, immediate fit.
   */
  abstract allowsChildType(childType: AST.QualifiedTypeName): boolean;

  /**
   * Valid amounts of children inside this category
   */
  abstract validCardinality(): OccursSpecificDescription;
}

/**
 * Describes bounds for the number of apperances a certain child may make.
 */
class ChildCardinality {
  private _nodeType: TypeReference;
  private _occurs: OccursSpecificDescription;

  constructor(typeDesc: Desc.NodeTypesChildReference, group: NodeTypeChildren) {
    const parent = group.parent;
    this._occurs = resolveChildOccurs(typeDesc);

    if (typeof typeDesc === "string") {
      // Simple strings always refer to the language of the parent.
      this._nodeType = new TypeReference(
        parent.validator,
        typeDesc,
        parent.languageName
      );
    } else if (Desc.isQualifiedTypeName(typeDesc)) {
      // Qualified names are easy, because it is clear what they refer to
      this._nodeType = new TypeReference(
        parent.validator,
        typeDesc.typeName,
        typeDesc.languageName
      );
    } else if (Desc.isChildCardinalityDescription(typeDesc)) {
      // Complex descriptions may refer to a different language
      if (typeof typeDesc.nodeType === "string") {
        this._nodeType = new TypeReference(
          parent.validator,
          typeDesc.nodeType,
          parent.languageName
        );
      } else {
        this._nodeType = new TypeReference(parent.validator, typeDesc.nodeType);
      }
    } else {
      throw new Error(
        `Unknown child cardinality: "${JSON.stringify(typeDesc)}"`
      );
    }
  }

  /**
   * @return The type that is restricted in its cardinality.
   */
  get nodeType() {
    return this._nodeType;
  }

  /**
   * @return The minimum number of occurences that are expected
   */
  get minOccurs() {
    return this._occurs.minOccurs;
  }

  /**
   * @return The maximum number of occurences that are expected
   */
  get maxOccurs() {
    return this._occurs.maxOccurs;
  }
}

/**
 * A function that takes the given list of nodes and attempts to
 * match them against the given list of children.
 *
 * @param nodeTypes The nodes (and the cardinality) that are expected to be present.
 * @param group The child group these children are placed in.
 * @param parent The parent node that is involved.
 * @param children The actual children to check.
 * @param firstIndex The first child index to check.
 * @param context Allows to report errors.
 */
type ChildrenValidationFunc = (
  nodeTypes: ChildCardinality[],
  group: NodeTypeChildren,
  parent: AST.SyntaxNode,
  children: AST.SyntaxNode[],
  firstIndex: number,
  context: ValidationContext
) => {
  firstUncheckedIndex: number;
  validNodes: AST.SyntaxNode[];
};

/**
 * Greedily ensures that the given nodes (and their cardinality) are present in the same
 * order in the children.
 *
 * @see ChildrenValidationFunc
 */
const validateSequence: ChildrenValidationFunc = (
  nodeTypes: ChildCardinality[],
  group: NodeTypeChildren,
  parent: AST.SyntaxNode,
  children: AST.SyntaxNode[],
  firstIndex: number,
  context: ValidationContext
) => {
  // These indices are expected
  const validIndices: AST.SyntaxNode[] = [];

  // Used to step through all children of `ast`
  let childIndex = firstIndex;

  // Using `foreach` over the node types to ensure that all types
  // we are expecting are actually present
  nodeTypes.forEach((expected) => {
    // This index starts counting for every type. It is used
    // to track whether minOccurences and maxOccurences are
    // satisfied or not.
    let subIndex = 0;

    // Try to "eat" as many children as possible
    while (subIndex < expected.maxOccurs) {
      // Is a child actually present?
      let child = children[childIndex];

      if (child) {
        // Yes, does it's type match?
        if (expected.nodeType.matchesType(child.qualifiedName)) {
          // Fine, we need to remember it
          validIndices.push(child);
        }
        // Is the minimum number of expected elements met? Then
        // we are done checking this child and allow the
        // next element in the sequence to take over.
        else if (subIndex >= expected.minOccurs) {
          return; // Effectively jumps to next `expected`
        }
        // We would expect more of this type, but haven't got any.
        else {
          // Hand out a (more or less) detailed error message
          const errData: ErrorIllegalChildType = {
            present: child.qualifiedName,
            expected: expected.nodeType.description,
            index: childIndex,
            category: group.categoryName,
          };
          context.addError(ErrorCodes.IllegalChildType, parent, errData);
        }
      }
      // There is no child, is that valid?
      else {
        if (subIndex < expected.minOccurs) {
          // There is no child present, but the current type expects it
          const errData: ErrorMissingChild = {
            expected: expected.nodeType.description,
            index: childIndex,
            category: group.categoryName,
          };
          context.addError(ErrorCodes.MissingChild, parent, errData);
        } else {
          // There is no child present, but thats OK
          return; // Effectively jumps to next `expected`
        }
      }

      // Go for the next child
      childIndex++;
      subIndex++;
    }
  });

  return {
    firstUncheckedIndex: childIndex,
    validNodes: validIndices,
  };
};

/**
 * Enforces a specific sequence of child-nodes of a parent node.
 */
class NodeComplexTypeChildrenSequence extends NodeComplexTypeChildrenValidator {
  private _nodeTypes: ChildCardinality[];
  private _group: NodeTypeChildren;

  constructor(
    group: NodeTypeChildren,
    desc: Desc.NodeTypesSequenceDescription
  ) {
    super();

    this._group = group;
    this._nodeTypes = desc.nodeTypes.map(
      (typeDesc) => new ChildCardinality(typeDesc, group)
    );
  }

  /**
   * Ensures the sequence is correct
   */
  validateChildrenImpl(
    parent: AST.SyntaxNode,
    children: AST.SyntaxNode[],
    context: ValidationContext
  ): AST.SyntaxNode[] {
    // The actual sequence validation walks over the existing node types
    let res = validateSequence(
      this._nodeTypes,
      this._group,
      parent,
      children,
      0,
      context
    );

    // Any children left at this point are errors
    for (let i = res.firstUncheckedIndex; i < children.length; i++) {
      const errData: ErrorSuperflousChild = {
        present: children[i].qualifiedName,
        index: i,
        category: this._group.categoryName,
      };
      context.addError(ErrorCodes.SuperflousChild, parent, errData);
    }

    // Valid children that should be checked more thorughly
    return res.validNodes;
  }

  /**
   * @return True, if the given type occurs anywhere in the list of possible types.
   */
  allowsChildType(childType: AST.QualifiedTypeName): boolean {
    return this._nodeTypes.some((t) => t.nodeType.matchesType(childType));
  }

  /**
   * @return The minimum and maximum number of children in this category as a whole
   */
  validCardinality(): OccursSpecificDescription {
    return this._nodeTypes.reduce<OccursSpecificDescription>(
      (akku, curr): OccursSpecificDescription => {
        return {
          maxOccurs: akku.maxOccurs + curr.maxOccurs,
          minOccurs: akku.minOccurs + curr.minOccurs,
        };
      },
      { minOccurs: 0, maxOccurs: 0 }
    );
  }
}

const validateAllowed: ChildrenValidationFunc = function (
  this: void,
  nodeTypes: ChildCardinality[],
  group: NodeTypeChildren,
  parent: AST.SyntaxNode,
  children: AST.SyntaxNode[],
  firstIndex: number,
  context: ValidationContext
) {
  let index = firstIndex;

  // These children are expected
  const toReturn: AST.SyntaxNode[] = [];
  // Initially no node has occured so far
  const occurences: number[] = nodeTypes.map((_) => 0);

  // The "allowed" restriction can be checked by iterating over children
  // directly, the types are resolved on demand.
  for (; index < children.length; ++index) {
    const node = children[index];
    // Find a matching type
    const cardinalityRef = nodeTypes.find((type) =>
      type.nodeType.matchesType(node.qualifiedName)
    );
    if (!cardinalityRef) {
      // The node is entirely unexpected
      context.addError(ErrorCodes.IllegalChildType, node, {
        index: index,
        present: node.qualifiedName,
        expected: nodeTypes.map((t) => t.nodeType.description),
      });
    } else {
      // The node is expected, but may occur too often. For the moment we simply count it.
      const cardinalityIndex = nodeTypes.indexOf(cardinalityRef);
      occurences[cardinalityIndex]++;
      toReturn.push(node);
    }
  }

  // Ensure that all cardinality limits have been respected
  occurences.forEach((num, index) => {
    const cardinalityRef = nodeTypes[index];
    if (num < cardinalityRef.minOccurs) {
      // A specific type appeared not often enough
      context.addError(ErrorCodes.InvalidMinOccurences, parent, {
        category: group.categoryName,
        type: nodeTypes[index].nodeType.description,
        minOccurs: cardinalityRef.minOccurs,
        actual: num,
      });
    }

    if (num > cardinalityRef.maxOccurs) {
      // A specific type appeared too often
      context.addError(ErrorCodes.InvalidMaxOccurences, parent, {
        category: group.categoryName,
        type: nodeTypes[index].nodeType.description,
        maxOccurs: cardinalityRef.maxOccurs,
        actual: num,
      });
    }
  });

  return {
    firstUncheckedIndex: index,
    validNodes: [],
  };
};

/**
 * Ensures that every child-node is of a type that has been explicitly
 * whitelisted.
 */
class NodeComplexTypeChildrenAllowed extends NodeComplexTypeChildrenValidator {
  private _nodeTypes: ChildCardinality[];

  constructor(
    private _group: NodeTypeChildren,
    desc: Desc.NodeTypesAllowedDescription
  ) {
    super();

    this._nodeTypes = desc.nodeTypes.map(
      (typeDesc) => new ChildCardinality(typeDesc, _group)
    );
  }

  /**
   * Ensures that every child has at least a matching type.
   */
  validateChildrenImpl(
    parent: AST.SyntaxNode,
    children: AST.SyntaxNode[],
    context: ValidationContext
  ) {
    const res = validateAllowed(
      this._nodeTypes,
      this._group,
      parent,
      children,
      0,
      context
    );
    return res.validNodes;
  }

  /**
   * @return True, if the given type occurs anywhere in the list of possible types.
   */
  allowsChildType(childType: AST.QualifiedTypeName): boolean {
    return this._nodeTypes.some((t) => t.nodeType.matchesType(childType));
  }

  /**
   * @return The minimum and maximum number of children in this category as a whole
   */
  validCardinality(): OccursSpecificDescription {
    return this._nodeTypes.reduce<OccursSpecificDescription>(
      (akku, curr): OccursSpecificDescription => {
        return {
          maxOccurs: akku.maxOccurs + curr.maxOccurs,
          minOccurs: akku.minOccurs + curr.minOccurs,
        };
      },
      { minOccurs: 0, maxOccurs: 0 }
    );
  }
}

/**
 * Ensures that at least one of the given choices matches the child group.
 */
class NodeComplexTypeChildrenChoice extends NodeComplexTypeChildrenValidator {
  private _desc: Desc.NodeTypesChoiceDescription;
  private _group: NodeTypeChildren;

  constructor(group: NodeTypeChildren, desc: Desc.NodeTypesChoiceDescription) {
    super();
    this._desc = desc;
    this._group = group;
  }

  /**
   * Runs the choice validation against a certain node.
   */
  protected validateChildrenImpl(
    parent: AST.SyntaxNode,
    ast: AST.SyntaxNode[],
    context: ValidationContext
  ): AST.SyntaxNode[] {
    if (ast.length === 0) {
      // TODO: Tell category
      context.addError(ErrorCodes.NoChoiceNodeAvailable, parent, {});
      return [];
    } else {
      // Check whether the first (and hopefully only) node is a match?
      const hasMatch = this._desc.choices.some((possible) => {
        // Build fully qualified type for this possibility.
        const possibleType = this.typeNameFromChoice(possible);

        // Check whether the type matches or not
        return AST.typenameEquals(possibleType, ast[0].qualifiedName);
      });

      if (!hasMatch) {
        context.addError(ErrorCodes.NoChoiceMatching, ast[0], {});
      }

      // If there are any more nodes: They shouldn't be there
      ast
        .slice(1)
        .forEach((node) =>
          context.addError(ErrorCodes.SuperflousChoiceNodeAvailable, node, {})
        );

      return hasMatch ? [ast[0]] : [];
    }
  }

  /**
   * @return The name of the language this validator is part of.
   */
  protected get ownLanguageName() {
    return this._group.parent.languageName;
  }

  protected typeNameFromChoice(
    possible: Desc.TypeReference
  ): AST.QualifiedTypeName {
    const possibleName =
      typeof possible === "string" ? possible : possible.typeName;
    const possibleLanguage =
      typeof possible === "string"
        ? this.ownLanguageName
        : possible.languageName;

    return {
      languageName: possibleLanguage,
      typeName: possibleName,
    };
  }

  /**
   * @return True, if the given type occurs anywhere in the list of possible types.
   */
  allowsChildType(childType: AST.QualifiedTypeName): boolean {
    return this._desc.choices
      .map((choice) => this.typeNameFromChoice(choice))
      .some((choiceType) => AST.typenameEquals(childType, choiceType));
  }

  /**
   * @return The minimum and maximum number of children in this category as a whole
   */
  validCardinality(): OccursSpecificDescription {
    return { maxOccurs: 0, minOccurs: 0 };
  }
}

/**
 * A child group in parentheses to verify the cardinality of more then a single item.
 */
class NodeComplexTypeChildrenParentheses extends NodeComplexTypeChildrenValidator {
  private _group: NodeTypeChildren;
  private _cardinality: OccursSpecificDescription;
  private _nodeTypes: ChildCardinality[];
  private _subChildValidator: ChildrenValidationFunc;

  constructor(
    group: NodeTypeChildren,
    desc: Desc.NodeTypesParenthesesDescription
  ) {
    super();
    this._cardinality = resolveOccurs(desc.cardinality);
    this._nodeTypes = desc.group.nodeTypes.map(
      (typeDesc) => new ChildCardinality(typeDesc, group)
    );
    this._group = group;

    switch (desc.group.type) {
      case "sequence":
        this._subChildValidator = validateSequence;
        break;
      case "allowed":
        this._subChildValidator = validateAllowed;
        break;
      default:
        throw new Error(
          `Unknown parentheses group validator: ${JSON.stringify(desc.group)}`
        );
    }
  }

  /**
   * Checks whether the grouping is valid and appears an appropriate number of times.
   */
  protected validateChildrenImpl(
    p: AST.SyntaxNode,
    children: AST.SyntaxNode[],
    c: ValidationContext
  ): AST.SyntaxNode[] {
    let currChildIndex = 0;
    let validNodes: AST.SyntaxNode[] = [];

    let numIterations = 0;

    // Empty expected types should not occur, but if they would
    // the following loop would run endlessly: As there is no expected type
    // to validate any child the child index is never incremented.
    if (this._nodeTypes.length > 0) {
      // Try to do as many iterations over the existing children as possible
      while (currChildIndex < children.length) {
        const res = this._subChildValidator(
          this._nodeTypes,
          this._group,
          p,
          children,
          currChildIndex,
          c
        );

        validNodes.push(...res.validNodes);
        currChildIndex = res.firstUncheckedIndex;

        numIterations++;
      }

      // Did we find enough children?
      if (numIterations < this._cardinality.minOccurs) {
        c.addError(ErrorCodes.InvalidMinOccurences, p, {
          category: this._group.categoryName,
          minOccurs: this._cardinality.minOccurs,
          actual: numIterations,
        });
      } else if (numIterations > this._cardinality.maxOccurs) {
        c.addError(ErrorCodes.InvalidMaxOccurences, p, {
          category: this._group.categoryName,
          maxOccurs: this._cardinality.maxOccurs,
          actual: numIterations,
        });
      }
    } else {
      // None of these children was expected (because no type was expected at all)
      // This is probably an error in the grammar and should never occur to a
      // normal end user.
      c.addError(ErrorCodes.ParenthesesEmptyTypes, p);
    }

    // Return only children that have been explicitly marked as valid
    return validNodes;
  }

  /**
   * @return True, if any of the mentioned children matches the given type.
   */
  allowsChildType(childType: AST.QualifiedTypeName): boolean {
    return this._nodeTypes.some((t) => t.nodeType.matchesType(childType));
  }

  /**
   * Checks the cardinalities of all children and then takes the cardinality
   * of the whole parentheses into account.
   *
   * @return The actual range of children that could occur.
   */
  validCardinality(): OccursSpecificDescription {
    const childCardinality: OccursSpecificDescription =
      this._nodeTypes.reduce<OccursSpecificDescription>(
        (akku, curr): OccursSpecificDescription => {
          return {
            maxOccurs: akku.maxOccurs + curr.maxOccurs,
            minOccurs: akku.minOccurs + curr.minOccurs,
          };
        },
        { minOccurs: 0, maxOccurs: 0 }
      );

    // A group that is not optional requires at least a single child,
    // Or to be more precise: There must be at least as many children as the cardinality
    // of the group itself requires.
    return {
      maxOccurs: childCardinality.maxOccurs * this._cardinality.maxOccurs,
      minOccurs: Math.max(
        childCardinality.minOccurs * this._cardinality.minOccurs,
        this._cardinality.minOccurs
      ),
    };
  }
}

/**
 * Validates any property.
 */
abstract class NodePropertyValidator {
  //! True if this property may be omitted from a node
  readonly isOptional: boolean;
  //! The type to use as the validation base
  readonly baseName: string;

  constructor(desc: Desc.NodePropertyTypeDescription) {
    this.isOptional = !!desc.isOptional;
    this.baseName = desc.base;
  }

  abstract validate(
    node: AST.SyntaxNode,
    value: string,
    context: ValidationContext
  ): void;

  get restrictions(): Desc.NodePropertyRestriction[] {
    return [];
  }
}

/**
 * Validates boolean properties
 */
export class NodePropertyBooleanValidator extends NodePropertyValidator {
  constructor(desc: Desc.NodePropertyBooleanDescription) {
    super(desc);
  }

  validate(
    node: AST.SyntaxNode,
    value: string,
    context: ValidationContext
  ): void {
    if (value != "true" && value != "false") {
      context.addError(ErrorCodes.IllegalPropertyType, node, {
        condition: `"${value}" must be either "true" or "false"`,
      });
    }
  }
}

/**
 * Validates integer properties
 */
export class NodePropertyIntegerValidator extends NodePropertyValidator {
  private _restrictions: Desc.NodeIntegerTypeRestrictions[];

  constructor(desc: Desc.NodePropertyIntegerDescription) {
    super(desc);
    this._restrictions = desc.restrictions;
  }

  validValue(value: unknown): value is number {
    // The typescript type system forbids other values then strings, but
    // they occasionally happen anyway.
    return typeof value === "string" && /^-?[0-9]+$/.test(value);
  }

  validate(
    node: AST.SyntaxNode,
    value: unknown,
    context: ValidationContext
  ): void {
    if (!this.validValue(value)) {
      context.addError(ErrorCodes.IllegalPropertyType, node, {
        condition: `"${value}" must be a string that looks like an integer`,
      });
    } else {
      // Check the valid value for possible restrictions
      this._restrictions?.forEach((r) => {
        switch (r.type) {
          case "minInclusive":
            if (+value < r.value) {
              context.addError(ErrorCodes.IllegalPropertyType, node, {
                condition: `Failed: ${value} ≥ ${r.value}`,
              });
            }
            break;
          case "maxInclusive":
            if (+value > r.value) {
              context.addError(ErrorCodes.IllegalPropertyType, node, {
                condition: `Failed: ${value} ≤ ${r.value}`,
              });
            }
            break;
        }
      });
    }
  }

  get restrictions(): Desc.NodeIntegerTypeRestrictions[] {
    return this._restrictions;
  }
}

/**
 * Validates properties that are meant to be strings.
 */
export class NodePropertyStringValidator extends NodePropertyValidator {
  private _restrictions: Desc.NodeStringTypeRestrictions[] = [];

  constructor(desc: Desc.NodePropertyStringDescription) {
    super(desc);
    if (desc.restrictions) {
      this._restrictions = desc.restrictions;
    }
  }

  validate(node: AST.SyntaxNode, value: string, context: ValidationContext) {
    this._restrictions.forEach((restriction) => {
      switch (restriction.type as string) {
        case "length":
          if (value.length != restriction.value) {
            context.addError(ErrorCodes.IllegalPropertyType, node, {
              condition: `${value.length} != ${restriction.value}`,
            });
          }
          break;
        case "minLength":
          if (value.length < restriction.value) {
            context.addError(ErrorCodes.IllegalPropertyType, node, {
              condition: `${value.length} < ${restriction.value}`,
            });
          }
          break;
        case "maxLength":
          if (value.length > restriction.value) {
            context.addError(ErrorCodes.IllegalPropertyType, node, {
              condition: `${value.length} > ${restriction.value}`,
            });
          }
          break;
        case "enum":
          if (!(restriction.value as string[]).includes(value)) {
            context.addError(ErrorCodes.IllegalPropertyType, node, {
              condition: `"${value}" in ${JSON.stringify(restriction.value)}`,
            });
          }
          break;
        case "regex":
          const regex = new RegExp(restriction.value as string);
          if (!regex.test(value)) {
            context.addError(ErrorCodes.IllegalPropertyType, node, {
              condition: `"${value}" did not match regular expression "${restriction.value}"`,
            });
          }
          break;
        default:
          throw new Error(`Unknown string restriction: "${restriction.type}"`);
      }
    });
  }

  get restrictions(): Desc.NodeStringTypeRestrictions[] {
    return this._restrictions;
  }
}

/**
 * Ensures that the given attribute is at least a valid ID. Also marks the id (if valid)
 * to be later on checked for existence.
 */
export class NodePropertyReferenceValidator extends NodePropertyValidator {
  private readonly _referenceType: Desc.NodePropertyReferenceDescription["base"];

  constructor(desc: Desc.NodePropertyReferenceDescription) {
    super(desc);
    this._referenceType = desc.base;
  }

  validate(
    node: AST.SyntaxNode,
    idValue: string,
    context: ValidationContext
  ): void {
    if (isValidId(idValue)) {
      context.addReference(this._referenceType, idValue);
    } else {
      context.addError(ErrorCodes.InvalidResourceId, node);
    }
  }
}

/**
 * Ensures that given nodes match exactly one of the types given
 * in the description.
 */
class NodeOneOfType extends NodeType {
  private _possibilities: TypeReference[] = [];

  constructor(
    validator: Validator,
    typeDesc: Desc.NodeOneOfTypeDescription,
    language: string,
    name: string
  ) {
    super(validator, language, name);

    this._possibilities = typeDesc.oneOf.map((t) =>
      typeof t === "string"
        ? new TypeReference(validator, t, language)
        : new TypeReference(validator, t)
    );
  }

  /**
   * As this node should never physically appear in a tree, asking
   * it for child categories is meaningless.
   */
  get requiredChildrenCategoryNames() {
    return [];
  }

  /**
   * As this node should never physically appear in a tree, asking
   * it for child categories is meaningless.
   */
  get allowedChildrenCategoryNames() {
    return [];
  }

  /**
   * As this node should never physically appear in a tree, asking
   * it for property names is meaningless.
   */
  get allowedPropertyNames(): string[] {
    return [];
  }

  /**
   * As this node should never physically appear in a tree, asking
   * it for valid cardinalities is meaningless.
   */
  validCardinality(_: string): OccursSpecificDescription {
    return { maxOccurs: 0, minOccurs: 0 };
  }

  /**
   * Checks whether the given node is one of the nodes.
   */
  validate(ast: AST.SyntaxNode, context: ValidationContext): void {
    // The "oneOf" node is not really a node that could be used anywhere
    if (
      this.languageName === ast.languageName &&
      this.typeName === ast.typeName
    ) {
      context.addError(ErrorCodes.TransientNode, ast, {
        present: ast.qualifiedName,
      } as ErrorUnexpectedType);
    } else {
      // Find a type that volunteers to do the actual further matching
      const concrete = this._possibilities.find((v) =>
        v.matchesType(ast.qualifiedName)
      );
      if (concrete) {
        concrete.validate(ast, context);
      } else {
        context.addError(ErrorCodes.UnexpectedType, ast, {
          present: ast.qualifiedName,
          expected: this._possibilities.map((p) => p.description),
        } as ErrorUnexpectedType);
      }
    }
  }

  /**
   * @return True if any type referenced by this instance  could be used to validate something
   *         of the given type.
   */
  matchesType(typeName: AST.QualifiedTypeName) {
    return this._possibilities.some((t) => t.matchesType(typeName));
  }

  allowsChildType(
    childType: AST.QualifiedTypeName,
    _categoryName: string
  ): boolean {
    return this.matchesType(childType);
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

  /**
   * @param validator Used when attempting to resolve this type.
   * @param desc The reference in qualified or unqualified form
   * @param currentLang The language to use in case of an unqualified reference
   */
  constructor(_validator: Validator, desc: QualifiedTypeName);
  constructor(_validator: Validator, desc: string, currentLang: string);
  constructor(
    _validator: Validator,
    desc: Desc.TypeReference,
    currentLang?: string
  ) {
    this._validator = _validator;

    if (Desc.isQualifiedTypeName(desc)) {
      this._languageName = desc.languageName;
      this._typeName = desc.typeName;
    } else if (typeof desc === "string") {
      this._languageName = currentLang;
      this._typeName = desc;
    } else {
      throw new Error("Impossible: Unknown type reference");
    }
  }

  /**
   * @return True, if the given node could be matched by the underlying type.
   */
  matchesType(qualifiedName: AST.QualifiedTypeName) {
    return this.type.matchesType(qualifiedName);
  }

  /**
   * Validates using the underlying reference.
   */
  validate(ast: AST.SyntaxNode, context: ValidationContext): void {
    this.type.validate(ast, context);
  }

  /**
   * @return True if this reference can be resolved to a "proper" type.
   */
  get isResolveable() {
    return this._validator.isKnownType(this._languageName, this._typeName);
  }

  /**
   * @return The actual underlying type this reference resolves to. Throws an exception
   *         if the type is not known.
   */
  private get type() {
    if (!this.isResolveable) {
      throw new Error(
        `Could not resolve type "${this._languageName}.${this._typeName}"`
      );
    } else {
      return this._validator.getType(this._languageName, this._typeName);
    }
  }

  /**
   * @return The description that is equivalent to this reference.
   */
  get description(): AST.QualifiedTypeName {
    return {
      languageName: this._languageName,
      typeName: this._typeName,
    };
  }
}

/**
 * A language consists of type definitions and a set of types that may occur at the root.
 */
export class GrammarValidator {
  private _registeredLanguages: {
    [languageName: string]: { [typeName: string]: NodeType };
  } = {};

  public readonly rootType: TypeReference;

  /**
   * Construct a new validator for a specific grammar.
   *
   * @param validator The parenting validator of this grammar, used to look
   *                  up possible cross references to other grammars.
   * @param description The description of the grammar to validate.
   */
  constructor(
    readonly validator: Validator,
    readonly description: Desc.GrammarDocument
  ) {
    this.validator = validator;

    // Ensure there is a bucket for every language
    const allLanguageNames = new Set([
      ...Object.keys(description.types),
      ...Object.keys(description.foreignTypes),
    ]);
    allLanguageNames.forEach((langName) => {
      this._registeredLanguages[langName] = {};
    });

    // Grammar needs to take local and foreign types into account
    const allTypes = allConcreteTypes(description);

    // Register all existing types
    Object.entries(allTypes).forEach(([langName, langTypes]) => {
      Object.entries(langTypes).forEach(([typeName, typeDesc]) => {
        this.registerTypeValidator(langName, typeName, typeDesc, description);
      });
    });

    // If a root type was specified: Make it resolveable
    if (description.root) {
      this.rootType = new TypeReference(validator, description.root);
    }
  }

  /**
   * @return All types that are part of this grammar.
   */
  get availableTypes(): NodeType[] {
    const nested = Object.values(this._registeredLanguages).map((lang) =>
      Object.values(lang)
    );
    return [].concat.apply([], nested);
  }

  /**
   * @return All languages that are part of this grammar.
   */
  get availableLanguages() {
    return Object.keys(this._registeredLanguages);
  }

  /**
   * Validates the given tree in the given context. Ensures that a valid
   * type is used as the root.
   */
  validateFromRoot(ast: AST.SyntaxNode, context: ValidationContext) {
    if (!this.rootType) {
      context.addError(ErrorCodes.UnspecifiedRoot, ast);
    } else if (!this.rootType.isResolveable) {
      context.addError(ErrorCodes.UnknownRoot, ast);
    } else {
      this.rootType.validate(ast, context);
    }
  }

  /**
   * @return True if the given typename is known in this language.
   */
  isKnownType(languageName: string, typename: string): boolean {
    const lang = this._registeredLanguages[languageName];
    return lang && !!lang[typename];
  }

  /**
   * @return The type with the matching name.
   */
  getType(n: AST.SyntaxNode): NodeConcreteType;
  getType(languageName: string, typename: string): NodeType;
  getType(nodeOrLang: string | AST.SyntaxNode, givenTypename?: string) {
    const languageName =
      nodeOrLang instanceof AST.SyntaxNode
        ? nodeOrLang.languageName
        : nodeOrLang;
    const typename =
      nodeOrLang instanceof AST.SyntaxNode
        ? nodeOrLang.typeName
        : givenTypename;

    if (!this.isKnownType(languageName, typename)) {
      throw new Error(
        `Could not get type "${languageName}.${typename}": Is unknown`
      );
    } else {
      return this._registeredLanguages[languageName][typename];
    }
  }

  /**
   * Registers a new type validator with this language.
   */
  private registerTypeValidator(
    languageName: string,
    nodeName: string,
    desc: Desc.NodeTypeDescription,
    grammarDoc: Desc.GrammarDocument
  ) {
    // Ensure that we don't override any types
    if (this.isKnownType(languageName, nodeName)) {
      throw new Error(
        `Attempted to register node "${nodeName}" twice for "${languageName}. Previous definition: ${JSON.stringify(
          this._registeredLanguages[nodeName]
        )}, Conflicting Definition: ${JSON.stringify(desc)}`
      );
    }

    // All types of the language we have at hand
    const langTypes = this._registeredLanguages[languageName];

    // Actually instantiate the correct validator
    if (Desc.isNodeConcreteTypeDescription(desc)) {
      langTypes[nodeName] = new NodeConcreteType(
        this.validator,
        desc,
        languageName,
        nodeName
      );
    } else if (Desc.isNodeOneOfTypeDescription(desc)) {
      langTypes[nodeName] = new NodeOneOfType(
        this.validator,
        desc,
        languageName,
        nodeName
      );
    } else if (Desc.isNodeVisualTypeDescription(desc)) {
      const origType = grammarDoc.foreignTypes?.[languageName]?.[nodeName];
      if (!origType) {
        const origName = languageName + "." + nodeName;
        throw new Error(`Visual type ${origName} has no concrete counterpart`);
      } else {
        this.registerTypeValidator(
          languageName,
          nodeName,
          origType,
          grammarDoc
        );
      }
    }
  }
}
