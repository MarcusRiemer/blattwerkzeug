// Documentation at https://github.com/prettier/prettier/blob/main/commands.md
// will be helpful when following this code.
import { builders, printer } from "prettier/doc";
import { EmittedHole } from "./codegenerator";
import { OutputSeparator } from "./codegenerator-process";
import {
  ensureCodeGenType,
  tagToSeparator,
  valueToPossiblyQuote,
} from "./codegenerator-util";
import {
  NamedLanguages,
  NodeAttributeDescription,
  NodeInterpolatePropertyDescription,
  NodePropertyTypeDescription,
  NodeTerminalSymbolDescription,
  Orientation,
  VisualisedLanguages,
} from "./grammar.description";
import { SyntaxNode } from "./syntaxtree";

type Doc = builders.Doc;

type GeneratorState = {
  holes: EmittedHole[]
}

function joinPrettierDocuments(docs: Doc[], between: Doc[] | Doc): Doc[] {
  between = Array.isArray(between) ? builders.concat(between) : between;

  return [builders.join(between, docs)];
}

function isPrettierGroup(obj: unknown): obj is builders.Group {
  return obj instanceof Object && obj["type"] === "group";
}

function isPrettierConcat(obj: unknown): obj is builders.Concat {
  return obj instanceof Object && obj["type"] === "concat";
}

function isPrettierIndent(obj: unknown): obj is builders.Indent {
  return obj instanceof Object && obj["type"] === "indent";
}

export function isPrettierLine(obj: unknown): obj is builders.Concat {
  // hardline is line + parentBreak
  if (isPrettierConcat(obj)) {
    return obj.parts.some(isPrettierLine);
  }

  return obj instanceof Object && obj["type"] === "line";
}

export function hasAnyNonWhitespace(obj: Doc[]): boolean {
  return (
    obj.length > 0 &&
    obj.some((d) => {
      if (typeof d === "string") {
        // Must be something other than whitespace
        return d.trim().length > 0;
      } else if (Array.isArray(d)) {
        return hasAnyNonWhitespace(d);
      } else if (isPrettierGroup(d) || isPrettierIndent(d)) {
        return hasAnyNonWhitespace([d.contents]);
      } else if (isPrettierConcat(d)) {
        return hasAnyNonWhitespace(d.parts);
      } else {
        return false;
      }
    })
  );
}

/**
 * Converts a terminal, with respect to all tags that may affect a terminal.
 *
 * @param newLine Used for separators
 */
function convertTerminal(
  t:
    | NodeTerminalSymbolDescription
    | NodeInterpolatePropertyDescription
    | NodePropertyTypeDescription,
  node: SyntaxNode
): Doc {
  const toReturn: Doc[] = [];
  const val = t.type === "terminal" ? t.symbol : node.properties[t.name];
  const sep = tagToSeparator(node, t.tags);

  if ((sep & OutputSeparator.NEW_LINE_BEFORE) > 0) {
    toReturn.push(builders.hardline);
  }
  if ((sep & OutputSeparator.SPACE_BEFORE) > 0) {
    toReturn.push(" ");
  }

  toReturn.push(valueToPossiblyQuote(val, t.tags));

  if ((sep & OutputSeparator.SPACE_AFTER) > 0) {
    toReturn.push(" ");
  }

  if ((sep & OutputSeparator.NEW_LINE_AFTER) > 0) {
    toReturn.push(builders.hardline);
  }

  if (toReturn.length === 1) {
    return toReturn[0];
  } else {
    return builders.concat(toReturn)
  }

}

/**
 * Process a list of attributes as if they belong to the given node.
 * This is part of a recursive process that is required for containers:
 * These may define a new attribute list on the same node.
 */
function processBlock(
  attributes: NodeAttributeDescription[],
  types: NamedLanguages | VisualisedLanguages,
  node: SyntaxNode,
  parentOrientation: Orientation,
  state: GeneratorState
): Doc[] {
  const toReturn: Doc[] = [];

  attributes.forEach((a, idx) => {
    const lastAttributeOfBlock = idx === attributes.length - 1;

    switch (a.type) {
      // Are converted by directly printing out some strings
      case "terminal":
      case "property":
      case "interpolate": {
        toReturn.push(convertTerminal(a, node));
        break;
      }

      // All of the following types have child nodes which will be delegated
      // to the running emit process
      case "allowed":
      case "sequence":
      case "parentheses":
      case "each": {
        const children = node.getChildrenInCategory(a.name);
        const between =
          "between" in a ? convertTerminal(a.between, node) : null;

        const childDocs = children.flatMap((childNode) => {
          const t = ensureCodeGenType(types, childNode);
          // A block is always considered to work horizontally
          return processBlock(t.attributes, types, childNode, "horizontal", state);
        });

        // Only actually build the subtree if there are any children inside
        // it. Otherwise we possibly introduce a hardline without having any
        // content
        if (hasAnyNonWhitespace(childDocs)) {
          if (between != null) {
            toReturn.push(...joinPrettierDocuments(childDocs, between));
          } else {
            toReturn.push(...childDocs);
          }
        }

        break;
      }

      // Containers are similar to nodes with children, but they
      // iteratore over something different: The node stays the same
      // while the attribute changes. This requires recursion and is
      // therefore handled in a separate case although it looks sort
      // of similar to syntax tree recursion.
      case "container": {
        let childDocs : Doc[] = processBlock(a.children, types, node, a.orientation, state);
        console.log("childDocs",  JSON.stringify(childDocs, undefined, " "))

        // Did we add more than possibly newlines?
        if (hasAnyNonWhitespace(childDocs)) {
          if (a.orientation === "vertical") {
            childDocs = childDocs
              .filter(c => hasAnyNonWhitespace([c]))
              .map((c, i) => i > 0 ? builders.concat([builders.hardline,c]): c)

            console.log("Filtered and broken child docs",  JSON.stringify(childDocs, undefined, " "))
          }

          // Vertical containers must start and end on their own line
          const doIndent = a.tags?.includes("indent");
          if (doIndent) {
            childDocs = [builders.indent(builders.concat([builders.hardline, ...childDocs]))]
          }

          switch (a.orientation) {
            case "horizontal":
              toReturn.push(builders.group(builders.concat(childDocs)))
              break;
            case "vertical":
              toReturn.push(...childDocs)
              break;
          }
        }
        break;
      }
    }
  });

  return toReturn;
}

/**
 * Generate a fragment for the given node based on the type or visualisation
 * definitions for the current node.
 *
 * @param types The types that are the basis for code generation
 * @param node  The node to process
 */
export function prettierCodeGeneratorFromGrammar(
  types: NamedLanguages | VisualisedLanguages,
  node: SyntaxNode
): string {
  console.log("Hallo Welt: prettierCodeGeneratorFromGrammar")
  const t = ensureCodeGenType(types, node);
  const prettierTree = processBlock(t.attributes, types, node, "horizontal", { holes: [] });

  console.log("Prettier Tree", JSON.stringify(prettierTree, undefined, " "))

  const printed = printer.printDocToString(
    // Don't leave last lines with nothing but whitespace
    builders.concat([...prettierTree, builders.trim]),
    {
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
    }
  );

  return printed.formatted.trim();
}
