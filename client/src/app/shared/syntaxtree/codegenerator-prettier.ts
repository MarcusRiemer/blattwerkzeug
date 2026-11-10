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
  holes: EmittedHole[];
};

const LEADING = OutputSeparator.SPACE_BEFORE | OutputSeparator.NEW_LINE_BEFORE;
const TRAILING = OutputSeparator.SPACE_AFTER | OutputSeparator.NEW_LINE_AFTER;

/**
 * A concrete document plus the separator tags that still have to be merged
 * with whatever is emitted beside it. Prettier itself prints every break it
 * is given, so overlapping tags are resolved before a doc is built.
 */
type Separated = {
  leading: OutputSeparator;
  parts: Doc[];
  trailing: OutputSeparator;
};

function piece(
  parts: Doc[],
  leading = OutputSeparator.NONE,
  trailing = OutputSeparator.NONE
): Separated {
  return { leading, parts, trailing };
}

function mergeLeading(
  previousTrailing: OutputSeparator,
  leading: OutputSeparator
): OutputSeparator {
  let next = leading;
  if (
    (previousTrailing & OutputSeparator.SPACE_AFTER) > 0 &&
    (next & OutputSeparator.SPACE_BEFORE) > 0
  ) {
    next &= ~OutputSeparator.SPACE_BEFORE;
  }
  if (
    (previousTrailing & OutputSeparator.NEW_LINE_AFTER) > 0 &&
    (next & OutputSeparator.NEW_LINE_BEFORE) > 0
  ) {
    next &= ~OutputSeparator.NEW_LINE_BEFORE;
  }
  return next;
}

function appendSeparated(out: Separated[], next: Separated) {
  if (out.length === 0) {
    out.push(next);
    return;
  }

  const previous = out[out.length - 1];
  out.push({
    leading: mergeLeading(previous.trailing, next.leading),
    parts: next.parts,
    trailing: next.trailing,
  });
}

function appendAll(out: Separated[], parts: Separated[]) {
  parts.forEach((part) => appendSeparated(out, part));
}

function mergeGroups(groups: Separated[][]): Separated[] {
  const out: Separated[] = [];
  groups.forEach((group) => appendAll(out, group));
  return out;
}

function sideBreaks(sep: OutputSeparator, side: "leading" | "trailing"): Doc[] {
  const docs: Doc[] = [];
  if (side === "leading") {
    if ((sep & OutputSeparator.NEW_LINE_BEFORE) > 0) {
      docs.push(builders.hardline);
    }
    if ((sep & OutputSeparator.SPACE_BEFORE) > 0) {
      docs.push(" ");
    }
  } else {
    if ((sep & OutputSeparator.SPACE_AFTER) > 0) {
      docs.push(" ");
    }
    if ((sep & OutputSeparator.NEW_LINE_AFTER) > 0) {
      docs.push(builders.hardline);
    }
  }
  return docs;
}

function realize(parts: Separated[]): Doc[] {
  const docs: Doc[] = [];
  parts.forEach((part) => {
    docs.push(...sideBreaks(part.leading, "leading"));
    docs.push(...part.parts);
    docs.push(...sideBreaks(part.trailing, "trailing"));
  });
  return docs;
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

function hasContent(parts: Separated[]): boolean {
  return hasAnyNonWhitespace(parts.flatMap((part) => part.parts));
}

/**
 * Puts a child group's own spacing tags on the outer edges. Bits on the
 * same edge collapse, and an empty group contributes nothing.
 */
function applyEdgeTags(
  parts: Separated[],
  tags: string[] | undefined,
  node: SyntaxNode
): Separated[] {
  if (parts.length === 0) {
    return parts;
  }

  const sep = tagToSeparator(node, tags);
  const out = parts.map((part) => ({ ...part }));
  out[0] = {
    ...out[0],
    leading: out[0].leading | (sep & LEADING),
  };
  const last = out.length - 1;
  out[last] = {
    ...out[last],
    trailing: out[last].trailing | (sep & TRAILING),
  };
  return out;
}

function terminalPiece(
  t:
    | NodeTerminalSymbolDescription
    | NodeInterpolatePropertyDescription
    | NodePropertyTypeDescription,
  node: SyntaxNode
): Separated {
  const sep = tagToSeparator(node, t.tags);
  const val = t.type === "terminal" ? t.symbol : node.properties[t.name];
  return piece(
    [valueToPossiblyQuote(val, t.tags)],
    sep & LEADING,
    sep & TRAILING
  );
}

/**
 * A newline requested by a vertical container. Merging drops it when the
 * previous piece already ends with newline-after.
 */
function verticalBreak(): Separated {
  return piece([], OutputSeparator.NEW_LINE_BEFORE);
}

/**
 * An indented group already opens with a hardline inside the indent, and a
 * piece may carry its own newline-before. A second break in front of either
 * would be a blank line.
 */
function groupOpensWithBreak(group: Separated[]): boolean {
  const first = group[0];
  if (!first) {
    return false;
  }
  if ((first.leading & OutputSeparator.NEW_LINE_BEFORE) > 0) {
    return true;
  }
  const doc = first.parts[0];
  if (!isPrettierIndent(doc)) {
    return false;
  }
  const contents = doc.contents;
  if (isPrettierConcat(contents)) {
    return contents.parts.length > 0 && isPrettierLine(contents.parts[0]);
  }
  return isPrettierLine(contents);
}

function stackVertical(groups: Separated[][]): Separated[] {
  const out: Separated[] = [];
  groups.forEach((group) => {
    if (!hasContent(group)) {
      return;
    }
    if (out.length > 0 && !groupOpensWithBreak(group)) {
      appendSeparated(out, verticalBreak());
    }
    appendAll(out, group);
  });
  return out;
}

function indentPiece(list: Separated[]): Separated {
  const body = list.map((part, index) =>
    index === 0
      ? { ...part, leading: part.leading & ~OutputSeparator.NEW_LINE_BEFORE }
      : { ...part }
  );
  const last = body.length - 1;
  const trailing = body[last].trailing;
  body[last] = { ...body[last], trailing: OutputSeparator.NONE };

  return piece(
    [builders.indent(builders.concat([builders.hardline, ...realize(body)]))],
    OutputSeparator.NONE,
    trailing
  );
}

function renderChildGroup(
  a: NodeAttributeDescription & { name: string; tags?: string[] },
  types: NamedLanguages | VisualisedLanguages,
  node: SyntaxNode,
  state: GeneratorState,
  orientation: Orientation
): Separated[] {
  const hole = state.holes.find(
    (candidate) => candidate.node === node && candidate.categoryName === a.name
  );
  if (hole) {
    return applyEdgeTags([piece([hole.holeText])], a.tags, node);
  }

  const children = node.getChildrenInCategory(a.name);
  const between = "between" in a ? a.between : undefined;
  const collected: Separated[] = [];
  children.forEach((childNode) => {
    const childType = ensureCodeGenType(types, childNode);
    const rendered = processBlock(
      childType.attributes,
      types,
      childNode,
      state
    );
    // An empty child contributes no line, so it contributes no break either.
    if (!hasContent(rendered)) {
      return;
    }
    if (collected.length > 0) {
      if (between) {
        appendSeparated(collected, terminalPiece(between, node));
      }
      if (orientation === "vertical") {
        appendSeparated(collected, verticalBreak());
      }
    }
    appendAll(collected, rendered);
  });

  // An optional group that produced no tokens must not leave its own space.
  if (!hasContent(collected)) {
    return [];
  }
  return applyEdgeTags(collected, a.tags, node);
}

function renderContainer(
  a: NodeAttributeDescription & {
    orientation: Orientation;
    children: NodeAttributeDescription[];
    tags?: string[];
  },
  types: NamedLanguages | VisualisedLanguages,
  node: SyntaxNode,
  state: GeneratorState
): Separated[] {
  const groups = a.children.map((child) =>
    renderAttribute(child, types, node, state, a.orientation)
  );
  const stacked =
    a.orientation === "vertical" ? stackVertical(groups) : mergeGroups(groups);
  if (!hasContent(stacked)) {
    return [];
  }
  if (a.tags?.includes("indent")) {
    return [indentPiece(stacked)];
  }
  if (a.orientation === "horizontal") {
    return [horizontalGroup(stacked)];
  }
  return stacked;
}

/**
 * The group's contents are realized, but the first leading break and the
 * last trailing break stay on the piece so a sibling outside the container
 * can merge with them.
 */
function horizontalGroup(stacked: Separated[]): Separated {
  const lastIndex = stacked.length - 1;
  const body = stacked.map((part, index) => ({
    ...part,
    leading: index === 0 ? OutputSeparator.NONE : part.leading,
    trailing: index === lastIndex ? OutputSeparator.NONE : part.trailing,
  }));

  return piece(
    [builders.group(builders.concat(realize(body)))],
    stacked[0].leading,
    stacked[lastIndex].trailing
  );
}

function renderAttribute(
  a: NodeAttributeDescription,
  types: NamedLanguages | VisualisedLanguages,
  node: SyntaxNode,
  state: GeneratorState,
  orientation: Orientation = "horizontal"
): Separated[] {
  switch (a.type) {
    case "terminal":
    case "property":
    case "interpolate":
      return [terminalPiece(a, node)];
    case "allowed":
    case "sequence":
    case "parentheses":
    case "each":
      return renderChildGroup(a, types, node, state, orientation);
    case "container":
      return renderContainer(a, types, node, state);
    default:
      return [];
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
  state: GeneratorState
): Separated[] {
  return mergeGroups(
    attributes.map((attribute) =>
      renderAttribute(attribute, types, node, state)
    )
  );
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
  node: SyntaxNode,
  holes: EmittedHole[] = []
): string {
  const t = ensureCodeGenType(types, node);
  const prettierTree = realize(
    processBlock(t.attributes, types, node, { holes })
  );

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
