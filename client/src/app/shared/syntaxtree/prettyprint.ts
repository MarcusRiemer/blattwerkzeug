import { recursiveJoin, NestedString } from "../nested-string";

import { NodeDescription, QualifiedTypeName } from "./syntaxtree.description";
import * as Desc from "./grammar.description";
import { orderTypes, allVisualisableTypes } from "./grammar-type-util";
import { OccursDescription } from "./occurs";
import { NodeTailoredDescription } from "../block";

/**
 * Converts the internal structure of a grammar into a more readable
 * version that reads similar to RelaxNG.
 */
export function prettyPrintGrammar(
  name: string,
  g: Desc.GrammarDocument
): string {
  const head = `grammar "${name}" {`;
  const tail = `}`;

  const allTypes = allVisualisableTypes(g);
  const orderedTypes = orderTypes(g);

  const nodes = orderedTypes
    .map((name): [
      QualifiedTypeName,
      Desc.NodeTypeDescription | Desc.NodeVisualTypeDescription
    ] => [name, allTypes[name.languageName][name.typeName]])
    .map(([name, t]) => prettyPrintType(name, t));

  const toReturn = [head, ...nodes, tail] as NestedString;

  return recursiveJoin("\n", "  ", toReturn);
}

/**
 * Picks the correct pretty printer for a certain type.
 */
export function prettyPrintType(
  name: QualifiedTypeName,
  t: Desc.NodeTypeDescription | Desc.NodeVisualTypeDescription
): NestedString {
  if (
    Desc.isNodeConcreteTypeDescription(t) ||
    Desc.isNodeVisualTypeDescription(t)
  ) {
    return prettyPrintConcreteNodeType(name, t);
  } else if (Desc.isNodeOneOfTypeDescription(t)) {
    return prettyPrintOneOfType(name, t);
  } else {
    throw Error(
      `Unknown type ${prettyPrintQualifiedTypeName(
        name
      )} to pretty print: ${JSON.stringify(t)}`
    );
  }
}

/**
 * Properly prints a fully qualified typename
 */
export function prettyPrintQualifiedTypeName(name: QualifiedTypeName): string {
  return `"${name.languageName}"."${name.typeName}"`;
}

/**
 * Prints the grammar for a concrete node.
 */
export function prettyPrintConcreteNodeType(
  name: QualifiedTypeName,
  t: Desc.NodeConcreteTypeDescription | Desc.NodeVisualTypeDescription
): NestedString {
  const type = Desc.isNodeConcreteTypeDescription(t) ? "node" : "visualize";
  const head = `${type} ${prettyPrintQualifiedTypeName(name)} {`;
  const attributes = (t.attributes ? t.attributes : []).map((a) =>
    prettyPrintConcreteNodeTypeAttribute(name, a)
  );

  if (attributes.length > 0) {
    return [head, ...attributes, `}`];
  } else {
    return [head, `}`];
  }
}

/**
 * Prints a single attribute of a concrete node
 */
export function prettyPrintConcreteNodeTypeAttribute(
  name: QualifiedTypeName,
  a: Desc.NodeAttributeDescription
): NestedString {
  switch (a.type) {
    case "property":
      return prettyPrintProperty(a);
    case "terminal":
      return prettyPrintTerminal(a);
    case "allowed":
    case "sequence":
    case "choice":
    case "parentheses":
      return prettyPrintChildGroup(name, a);
    case "interpolate":
      return prettyPrintInterpolateProperty(a);
    case "each":
      return prettyPrintInterpolateChildren(a);
    case "container":
      return prettyPrintContainer(name, a);
    default:
      throw new Error(
        `Unknown concrete node attribute type: ${JSON.stringify(a)}`
      );
  }
}

/**
 * Prints the grammar for a placeholder node.
 */
export function prettyPrintOneOfType(
  name: QualifiedTypeName,
  t: Desc.NodeOneOfTypeDescription
): NestedString {
  return [
    `typedef ${prettyPrintQualifiedTypeName(name)} ::= ${t.oneOf.join(" | ")}`,
  ];
}

/**
 * Prints the grammar for a terminal symbol
 */
export function prettyPrintTerminal(p: Desc.NodeTerminalSymbolDescription) {
  // The escaped symbol without the surrounding " "
  const escapedSymbol = JSON.stringify(p.symbol).slice(1, -1);

  if (typeof p.name === "string") {
    return [`terminal "${p.name}" "${escapedSymbol}"`];
  } else {
    return [`"${escapedSymbol}"`];
  }
}

/**
 * Prints the grammar for a property
 */
export function prettyPrintProperty(
  p: Desc.NodePropertyTypeDescription
): NestedString {
  const headName = Desc.isNodePropertyDesciption(p) ? "prop" : "interpolate";
  const optional = Desc.isNodePropertyDesciption(p) && p.isOptional ? "?" : "";
  const head = `${headName}${optional} "${p.name}"`;

  if (Desc.isNodePropertyDesciption(p)) {
    const restrictionSign = (baseType: string) => {
      switch (baseType) {
        case "length":
          return "==";
        case "minLength":
          return ">";
        case "maxLength":
          return "<";
        case "minInclusive":
          return "≥";
        case "maxInclusive":
          return "≤";
        default:
          return baseType;
      }
    };

    let restrictions: string[] = [];
    if (Desc.isNodePropertyStringDesciption(p) && p.restrictions) {
      restrictions = p.restrictions.map((r) => {
        switch (r.type) {
          case "length":
          case "maxLength":
          case "minLength":
            return `length ${restrictionSign(r.type)} ${r.value}`;
          case "enum":
            return `${r.type} ${r.value
              .map((v) => JSON.stringify(v))
              .join(" ")}`;
        }
      });
    } else if (Desc.isNodePropertyIntegerDesciption(p) && p.restrictions) {
      restrictions = p.restrictions.map(
        (r) => `${restrictionSign(r.type)} ${r.value}`
      );
    }

    if (restrictions.length === 0) {
      return [`${head} { ${p.base} }`];
    } else if (restrictions.length === 1) {
      return [`${head} { ${p.base} ${restrictions[0]} }`];
    } else {
      return [head + " {", [p.base + " {", restrictions, "}"], "}"];
    }
  } else {
    return [head];
  }
}

/**
 * Cardinalities are  mapped to the standard regex operators ?,+ and * or expressed using
 * the {min,max}-bracket notation.
 */
export function prettyPrintCardinality(t: OccursDescription) {
  if (typeof t === "string") {
    if (t !== "1") {
      return t;
    } else {
      return "";
    }
  } else {
    if (t.minOccurs === 0 && t.maxOccurs === 1) {
      return "?";
    } else if (
      t.minOccurs === 1 &&
      (t.maxOccurs === undefined || t.maxOccurs === +Infinity)
    ) {
      return "+";
    } else if (
      t.minOccurs === 0 &&
      (t.maxOccurs === undefined || t.maxOccurs === +Infinity)
    ) {
      return "*";
    } else {
      if (t.minOccurs === undefined) {
        return `{,${t.maxOccurs}}`;
      } else if (t.maxOccurs === undefined) {
        return `{${t.minOccurs},}`;
      } else {
        return `{${t.minOccurs},${t.maxOccurs}}`;
      }
    }
  }
}

/**
 * Takes a node reference, possibly with its cardinality description,
 * and returns a pretty string version of it.
 *
 * @param nodeName The typename of the node this reference is mentioned on
 * @param t The type reference to to print
 */
export function prettyPrintTypeReference(
  nodeName: QualifiedTypeName,
  t: Desc.NodeTypesChildReference
) {
  if (Desc.isQualifiedTypeName(t)) {
    // If the referenced language name is the same as the language it was
    // defined in: Omit the reference
    if (nodeName.languageName === t.languageName) {
      return t.typeName;
    } else {
      return `${t.languageName}.${t.typeName}`;
    }
  } else if (Desc.isChildCardinalityDescription(t)) {
    const printedName = prettyPrintTypeReference(nodeName, t.nodeType);
    return `${printedName}${prettyPrintCardinality(t.occurs)}`;
  } else {
    return t;
  }
}

/**
 * Prints the grammar of a single child group.
 */
export function prettyPrintChildGroup(
  nodeName: QualifiedTypeName,
  p: Desc.NodeChildrenGroupDescription
): NestedString {
  let sep = "";
  if ((p.type === "allowed" || p.type === "sequence") && p.between) {
    sep = `, between: "${p.between.symbol}"`;
  }
  const prettyType = p.type === "parentheses" ? p.group.type : p.type;
  return [
    `children ${prettyType} "${p.name}"${sep} ::= ` +
      prettyPrintChildGroupElements(nodeName, p),
  ];
}

/**
 * Prints the elements of a single child group. This may be a simple list of elements
 * (for "sequence" and "allowed" groups) or recursive definitions of child groups ("choice").
 */
function prettyPrintChildGroupElements(
  nodeName: QualifiedTypeName,
  p: Desc.NodeChildrenGroupDescription
): string {
  // Sequences and allowed groups can be printed by simply joining the elements
  switch (p.type) {
    case "sequence":
    case "allowed":
      // Figuring out the connector
      let connector = (
        p: Desc.NodeTypesAllowedDescription | Desc.NodeTypesSequenceDescription
      ) => {
        if (Desc.isNodeTypesAllowedDescription(p)) {
          return " & ";
        } else {
          return " ";
        }
      };

      return p.nodeTypes
        .map((ref) => prettyPrintTypeReference(nodeName, ref))
        .join(connector(p));
    case "parentheses":
      // We want to re-use the existing code above, so we need to construct
      // a child group with a name on the fly. As the name is not used on this
      // level it **should** not matter.
      const hackedChildGroup:
        | Desc.NodeTypesAllowedDescription
        | Desc.NodeTypesSequenceDescription = {
        type: p.group.type as any,
        nodeTypes: p.group.nodeTypes,
        name: "dirtyHack",
      };
      const prettyChildren = prettyPrintChildGroupElements(
        nodeName,
        hackedChildGroup
      );
      const prettyCardinality = prettyPrintCardinality(p.cardinality);
      return `(${prettyChildren})${prettyCardinality}`;

    case "choice":
      return p.choices
        .map((ref) => prettyPrintTypeReference(nodeName, ref))
        .join(` | `);
    default:
      throw new Error(`Can't print child group of type "${(p as any).type}"`);
  }
}

export function prettyPrintInterpolateProperty(
  t: Desc.NodeInterpolatePropertyDescription
): NestedString {
  return [`{{${t.name}}}`];
}

export function prettyPrintInterpolateChildren(
  t: Desc.NodeInterpolateChildrenDescription
): NestedString {
  return [`{{#each ${t.name}}}`];
}

export function prettyPrintContainer(
  name: QualifiedTypeName,
  t: Desc.NodeVisualContainerDescription
): NestedString {
  const head = `container ${t.orientation}`;
  if ((t.children || []).length === 0) {
    return [head + " { }"];
  } else {
    return [
      head + " {",
      ...t.children.map((sub) =>
        prettyPrintConcreteNodeTypeAttribute(name, sub)
      ),
      "}",
    ];
  }
}

export function prettyPrintSyntaxTree(desc: NodeDescription): string {
  const toReturn = prettyPrintSyntaxTreeNode(desc);
  return recursiveJoin("\n", "  ", toReturn);
}

/**
 * Pretty prints a node of a syntaxtree. This includes all children of the given node.
 */
export function prettyPrintSyntaxTreeNode(
  ...desc: NodeTailoredDescription[]
): NestedString {
  let allDescriptions = Array.isArray(desc) ? desc : [desc];

  let allCompiled = allDescriptions.map((desc) => {
    const head = `node "${desc.language}.${desc.name}"`;

    const props = Object.entries(desc.properties || {}).map(([key, value]) => [
      `prop "${key}" ${value}`,
    ]);
    const children = Object.entries(desc.children || {}).map(([key, value]) => {
      return [
        `childGroup "${key}" {`,
        ...value.map((n) => prettyPrintSyntaxTreeNode(n)),
        `}`,
      ];
    });

    if (props.length > 0 || children.length > 0) {
      return [head + ` {`, ...props, ...children, `}`];
    } else {
      return [head];
    }
  });

  // TODO: Also return the other compiled nodes
  return allCompiled[0];
}

/**
 * Calculates the graphviz-representation of the given syntaxtree.
 */
export function graphvizSyntaxTree(desc: NodeDescription): string {
  const tree = [
    `digraph SyntaxTree {`,
    [
      `graph [fontsize=10 fontname="Verdana" bgcolor="transparent"];`,
      `node [fontsize=10 fontname="Verdana" shape=Mrecord];`,
      `edge [fontsize=10 fontname="Verdana"];`,
    ],
    graphvizSyntaxTreeNode(desc, "r"),
    `}`,
  ];
  return recursiveJoin("\n", "  ", tree);
}

/**
 * Calculates the graphviz-representation of a single node.
 */
export function graphvizSyntaxTreeNode(
  desc: NodeDescription,
  path: string
): NestedString {
  const props = Object.entries(desc.properties || {})
    .map(([k, v]) => `{${k}|${v}}`)
    .join("|");
  const typename = desc.language + "." + desc.name;

  // The label of the node might or might note incorporate properties
  const nodeLabel = props != "" ? `{{${typename}}|${props}}` : `{${typename}}`;

  // Render all children in all named child groups
  const childGroups = Object.entries(desc.children || {}).map(([k, v]) => {
    return [
      // Beware: GraphViz requires subgraphs to be prefixed with `cluster_` in order
      // to render a box around it.
      `subgraph cluster_${path}_${k} {`,
      [`label="${k}";`],
      // Append the name of the child group and the index of the node to
      // form a unique path
      ...v.map((v, i) => graphvizSyntaxTreeNode(v, `${path}_${k}_${i}`)),
      `}`,
      // Create the connection from the parent
      ...v.map((_, i) => `${path} -> ${path}_${k}_${i};`),
    ];
  });

  // We need to shave of the outer list of the child groups
  let toReturn = [`${path} [label="${nodeLabel}"];`];
  return toReturn.concat(...(childGroups as any));
}
