import { NodeDescription, QualifiedTypeName } from "../syntaxtree.description";
import { SyntaxTree, SyntaxNode } from "../syntaxtree";
import {
  NodePropertyTypeDescription,
  NodeTerminalSymbolDescription,
  NodeChildrenGroupDescription,
  isNodeTypesSequenceDescription,
  isNodeTypesAllowedDescription,
  NodeTypesChildReference,
  NodeAttributeDescription,
  GrammarDocument,
  NodeConcreteTypeDescription,
  NodeOneOfTypeDescription,
  ChildCardinalityDescription,
  NodeVisualContainerDescription,
  Orientation,
  NodeInterpolatePropertyDescription,
  NodeVisualTypeDescription,
  NodeInterpolateChildrenDescription,
  NamedLanguages,
  VisualisedLanguages,
  NodePropertyRestriction,
} from "../grammar.description";
import { OccursDescription, OccursString } from "../occurs.description";
import { BlattWerkzeugError } from "../../blattwerkzeug-error";

export function convertProperty(
  attrNode: SyntaxNode
): NodePropertyTypeDescription {
  const toReturn: ReturnType<typeof convertProperty> = {
    type: "property",
    base: attrNode.properties["base"] as any,
    name: attrNode.properties["name"],
  };

  // TODO: Properly split up restrictions based on the actual type
  const restrictionNodes = attrNode.getChildrenInCategory("restrictions");
  const restrictions = restrictionNodes.map((r): NodePropertyRestriction => {
    switch (r.typeName) {
      case "restrictionEnum":
        return {
          type: "enum",
          value: r
            .getChildrenInCategory("values")
            .map((v) => v.properties["value"]),
        };
      default:
        throw new Error(`Unknown property restriction "${r.typeName}"`);
    }
  });

  if (
    restrictionNodes.length > 0 &&
    (toReturn.base === "integer" || toReturn.base === "string")
  ) {
    toReturn.restrictions = restrictions as any;
  }

  possiblyAddTags(attrNode, toReturn);

  return toReturn;
}

export function convertInterpolate(
  attrNode: SyntaxNode
): NodeInterpolatePropertyDescription {
  const toReturn: ReturnType<typeof convertInterpolate> = {
    type: "interpolate",
    name: attrNode.properties["name"],
  };

  possiblyAddTags(attrNode, toReturn);

  return toReturn;
}

/**
 * Converts a node that represents a terminal symbol to a description.
 */
export function convertTerminal(
  attrNode: SyntaxNode
): NodeTerminalSymbolDescription {
  const toReturn: ReturnType<typeof convertTerminal> = {
    type: "terminal",
    symbol: attrNode.properties["symbol"],
  };

  if (attrNode.properties["name"]) {
    toReturn.name = attrNode.properties["name"];
  }

  possiblyAddTags(attrNode, toReturn);

  return toReturn;
}

export function convertNodeRefOne(ref: SyntaxNode): QualifiedTypeName {
  if (!ref) {
    throw new Error(`convertNodeRefOne called with falsy value: ${ref}`);
  } else if (ref.typeName === "nodeRefOne") {
    return {
      languageName: ref.properties["languageName"],
      typeName: ref.properties["typeName"],
    };
  } else {
    throw new Error(
      `convertNodeRefOne called with typeName: "${ref.typeName}"`
    );
  }
}

export function convertOccurs(ref: SyntaxNode): OccursDescription {
  if (!ref) {
    throw new Error(`convertOccurs called with falsy value: ${ref}`);
  }

  switch (ref.typeName) {
    case "knownCardinality":
      return OccursString.check(ref.properties["cardinality"]);
    default:
      throw new Error(`convertOccurs called with typeName: "${ref.typeName}"`);
  }
}

function convertNodeRefCardinality(
  ref: SyntaxNode
): ChildCardinalityDescription {
  return {
    nodeType: convertNodeRefOne(ref.getChildInCategory("references")),
    occurs: convertOccurs(ref.getChildInCategory("cardinality")),
  };
}

export function convertChildren(
  attrNode: SyntaxNode
): NodeChildrenGroupDescription {
  const toReturn: ReturnType<typeof convertChildren> = {
    type: attrNode.properties["base"] as any,
    name: attrNode.properties["name"],
    nodeTypes: undefined,
  };

  if (
    isNodeTypesAllowedDescription(toReturn) ||
    isNodeTypesSequenceDescription(toReturn)
  ) {
    const typeReferences: NodeTypesChildReference[] = attrNode
      .getChildrenInCategory("references")
      .map((ref) => {
        switch (ref.typeName) {
          case "nodeRefOne":
            return convertNodeRefOne(ref);
          case "nodeRefCardinality":
            return convertNodeRefCardinality(ref);
          default:
            throw new Error(`Unknown reference: "${ref.typeName}"`);
        }
      });

    toReturn.nodeTypes = typeReferences;
  }

  const between = attrNode.getChildInCategory("between");
  if (between) {
    toReturn.between = convertTerminal(between);
  }

  possiblyAddTags(attrNode, toReturn);

  return toReturn;
}

export function convertEach(
  attrNode: SyntaxNode
): NodeInterpolateChildrenDescription {
  const toReturn: ReturnType<typeof convertEach> = {
    type: "each",
    name: attrNode.properties["name"],
  };

  possiblyAddTags(attrNode, toReturn);

  return toReturn;
}

export function convertContainer(
  attrNode: SyntaxNode
): NodeVisualContainerDescription {
  const orientationNode = attrNode.getChildInCategory("orientation");

  const toReturn: NodeVisualContainerDescription = {
    type: "container",
    orientation: Orientation.check(orientationNode.properties["orientation"]),
    children: [],
  };

  attrNode.getChildrenInCategory("attributes").forEach((subAttrNode) => {
    readAttributes(subAttrNode, toReturn.children);
  });

  possiblyAddTags(attrNode, toReturn);

  return toReturn;
}

export function possiblyAddTags(
  toParse: SyntaxNode,
  target: { tags?: string[] }
) {
  const tags = toParse
    .getChildrenInCategory("tags")
    .map((t) => t.properties["name"]);
  if (tags.length > 0) {
    target.tags = tags;
  }
}

/**
 * Converts the given node into a description that is appended to the given
 * target list.
 */
export function readAttributes(
  attrNode: SyntaxNode,
  target: NodeAttributeDescription[]
) {
  switch (attrNode.typeName) {
    case "property":
      target.push(convertProperty(attrNode));
      break;
    case "interpolate":
      target.push(convertInterpolate(attrNode));
      break;
    case "terminal":
      target.push(convertTerminal(attrNode));
      break;
    case "each":
      target.push(convertEach(attrNode));
      break;
    case "children":
      target.push(convertChildren(attrNode));
      break;
    case "container":
      target.push(convertContainer(attrNode));
      break;
  }
}

/**
 * Converts the given node to a type reference that has no cardinality.
 */
export function resolveSingularReference(
  refNode: SyntaxNode
): QualifiedTypeName {
  switch (refNode.typeName) {
    case "nodeRefOne":
      return {
        languageName: refNode.properties["languageName"],
        typeName: refNode.properties["typeName"],
      };
    default:
      throw new Error(
        `Could not resolve reference of type "${refNode.languageName}"."${refNode.typeName}"`
      );
  }
}

/**
 * Convert an AST to a "proper" JSON-object.
 */
export function readFromNode(
  node: NodeDescription,
  throwOnError: boolean
): GrammarDocument {
  const toReturn: ReturnType<typeof readFromNode> = {
    types: {},
    foreignTypes: {},
    visualisations: {},
    foreignVisualisations: {},
    root: undefined,
  };

  const tree = new SyntaxTree(node);

  // Extract the root this tree defines
  const nodeRoot = tree.rootNode.getChildInCategory("root");
  if (nodeRoot) {
    toReturn.root = {
      languageName: nodeRoot.properties["languageName"],
      typeName: nodeRoot.properties["typeName"],
    };
  }

  // References to other grammars: includes and visualizes
  ["includes", "visualizes"].forEach((categoryName) => {
    const includesNode = tree.rootNode.getChildInCategory(categoryName);
    if (includesNode) {
      toReturn[categoryName] = includesNode
        .getChildrenInCategory("includes")
        .map((refNode) => refNode.properties["grammarId"]);
    }
  });

  // Add all defined types
  const definedTypes = tree.rootNode.getChildrenInCategory("nodes");
  definedTypes
    .filter((n) => n.typeName.match(/typedef|(concrete|visualize)Node/))
    .forEach((n) => {
      const isVisual = n.typeName === "visualizeNode";
      const nameNode = isVisual ? n.getChildInCategory("references") : n;

      if (nameNode === undefined) {
        if (throwOnError) {
          throw new BlattWerkzeugError(
            `Attempted to visualize unknown node: ${JSON.stringify(
              n.toModel()
            )}`
          );
        } else {
          return;
        }
      }

      const languageName = nameNode.properties["languageName"];
      const typeName = nameNode.properties["typeName"];

      if (!typeName || !languageName) {
        if (throwOnError) {
          throw new BlattWerkzeugError(
            `Attempted to read node without qualified Type: ${JSON.stringify(
              n.toModel()
            )}`
          );
        } else {
          return;
        }
      }

      const container: VisualisedLanguages | NamedLanguages = isVisual
        ? toReturn.visualisations
        : toReturn.types;

      // Ensure the language is known
      if (!container[languageName]) {
        container[languageName] = {};
      }

      // Ensure the type is not already taken
      const langTypes = container[languageName];
      if (langTypes[typeName]) {
        if (throwOnError) {
          throw new BlattWerkzeugError(
            `Duplicate node "${languageName}.${typeName}" of type "${n.typeName}"`
          );
        } else {
          return;
        }
      }

      // Add the correct type of type
      if (isVisual) {
        const visualiseNode: NodeVisualTypeDescription = {
          type: "visualise",
          attributes: [],
        };

        n.getChildrenInCategory("attributes").forEach((a) =>
          readAttributes(a, visualiseNode.attributes)
        );

        langTypes[typeName] = visualiseNode;
      } else {
        switch (n.typeName) {
          case "concreteNode": {
            const concreteNode: NodeConcreteTypeDescription = {
              type: "concrete",
              attributes: [],
            };

            possiblyAddTags(n, concreteNode);

            n.getChildrenInCategory("attributes").forEach((a) =>
              readAttributes(a, concreteNode.attributes)
            );

            langTypes[typeName] = concreteNode;
            break;
          }
          case "typedef":
            const references = n
              .getChildrenInCategory("references")
              .map(resolveSingularReference);

            const oneOfNode: NodeOneOfTypeDescription = {
              type: "oneOf",
              oneOf: references,
            };

            langTypes[typeName] = oneOfNode;
            break;
          default:
            throw Error(
              `Unknown definition "${languageName}"."${typeName}" with type "${n.typeName}"`
            );
        }
      }
    });

  return toReturn;
}
