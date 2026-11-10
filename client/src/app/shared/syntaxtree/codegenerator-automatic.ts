import { CodeGeneratorProcess, OutputSeparator } from "./codegenerator-process";
import {
  AutomaticCodeGenerationError,
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
  VisualisedLanguages,
} from "./grammar.description";
import { SyntaxNode } from "./syntaxtree";

const SEPARATOR_BEFORE =
  OutputSeparator.SPACE_BEFORE | OutputSeparator.NEW_LINE_BEFORE;
const SEPARATOR_AFTER =
  OutputSeparator.SPACE_AFTER | OutputSeparator.NEW_LINE_AFTER;

/**
 * Various things may specify that the require indentation. This helper
 * method wraps the given action to be indented if needed.
 */
function possiblyIndent(
  entity: { tags?: string[] },
  process: CodeGeneratorProcess<any>,
  action: () => void
) {
  if (entity.tags?.includes("indent")) {
    process.indent(action);
  } else {
    action();
  }
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
  node: SyntaxNode,
  process: CodeGeneratorProcess<any>,
  newLine = false
) {
  const val = t.type === "terminal" ? t.symbol : node.properties[t.name];

  const sep = newLine
    ? OutputSeparator.NEW_LINE_AFTER
    : tagToSeparator(node, t.tags);
  process.addConvertedFragment(valueToPossiblyQuote(val, t.tags), node, sep);
}

/**
 * Process a list of attributes as if they belong to the given node.
 * This is part of a recursive process that is required for containers:
 * These may define a new attribute list on the same node.
 */
function processAttributes(
  attributes: NodeAttributeDescription[],
  types: NamedLanguages | VisualisedLanguages,
  node: SyntaxNode,
  process: CodeGeneratorProcess<any>,
  parentOrientation: "horizontal" | "vertical"
) {
  // Breaks after the given action if the action has lead to some
  // kind of emitted code.
  const possiblyBreakAfter = (action: () => void) => {
    const changes = process.trackChanges(action);
    if (changes.length > 0 && parentOrientation === "vertical") {
      const lastChange = changes[changes.length - 1];
      if ((lastChange.sep & OutputSeparator.NEW_LINE_AFTER) === 0) {
        process.addConvertedFragment("", node, OutputSeparator.NEW_LINE_AFTER);
      }
    }
  };

  attributes.forEach((a) => {
    switch (a.type) {
      // Are converted by directly printing out some strings
      case "terminal":
      case "property":
      case "interpolate": {
        possiblyBreakAfter(() => {
          convertTerminal(a, node, process);
        });
        break;
      }

      // All of the following types have child nodes which will be delegated
      // to the running emit process
      case "allowed":
      case "sequence":
      case "parentheses":
      case "each": {
        const children = node.getChildrenInCategory(a.name);
        const between = "between" in a ? a.between : undefined;
        const sep = tagToSeparator(node, a.tags);
        const before = sep & SEPARATOR_BEFORE;
        const after = sep & SEPARATOR_AFTER;

        // Empty fragments let emit() merge this space with a neighbour's.
        if (children.length > 0 && before !== OutputSeparator.NONE) {
          process.addConvertedFragment("", node, before);
        }

        // Possibly end the vertical container with a break
        children.forEach((c, i) => {
          if (i > 0) {
            // Stick the separator in the previous line
            if (between) {
              convertTerminal(
                between,
                node,
                process,
                parentOrientation === "vertical"
              );
            }
          }

          process.generateNode(c);
        });

        if (children.length > 0 && after !== OutputSeparator.NONE) {
          process.addConvertedFragment("", node, after);
        }

        break;
      }

      // Containers are similar to nodes with children, but they
      // iteratore over something different: The node stays the same
      // while the attribute changes. This requires recursion and is
      // therefore handled in a separate case although it looks sort
      // of similar to tree recursion.
      case "container": {
        // Do not emit all sorts of useless newlines if there aren't any
        // children that would require them
        if (a.children.length > 0) {
          possiblyIndent(a, process, () => {
            possiblyBreakAfter(() => {
              processAttributes(
                a.children,
                types,
                node,
                process,
                a.orientation
              );
            });
          });
        }
      }
    }
  });
}

/**
 * Generate a fragment for the given node based on the type or visualisation
 * definitions for the current node.
 *
 * @param types The types that are the basis for code generation
 * @param node  The node to process
 * @param process The current code generation process
 */
export function codeGeneratorFromGrammar(
  types: NamedLanguages | VisualisedLanguages,
  node: SyntaxNode,
  process: CodeGeneratorProcess<any>
) {
  const t = ensureCodeGenType(types, node);
  processAttributes(t.attributes, types, node, process, "horizontal");
}
