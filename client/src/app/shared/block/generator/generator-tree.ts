import { generateSidebar } from "./sidebar";
import { TreeBlockLanguageGeneratorDescription } from "./generator.description";
import { defaultEditorComponents } from "./generator-default";

import { BlockLanguageDocument } from "../block-language.description";
import {
  VisualBlockDescriptions,
  EditorBlockDescription,
} from "../block.description";

import {
  GrammarDocument,
  NodeConcreteTypeDescription,
  NodeAttributeDescription,
  NodePropertyTypeDescription,
  NodeChildrenGroupDescription,
} from "../../syntaxtree";
import { allConcreteTypes } from "../../syntaxtree/grammar-type-util";

/**
 * Takes a grammar description and a description how to transform it and
 * generates the corresponding block language.
 */
export function convertGrammarTreeInstructions(
  d: TreeBlockLanguageGeneratorDescription,
  g: GrammarDocument
): BlockLanguageDocument {
  const concreteTypes = allConcreteTypes(g, (t) => t.type === "concrete");

  // Some information is provided 1:1 by the generation instructions,
  // these can be copied over without further ado.
  const toReturn: BlockLanguageDocument = {
    editorBlocks: [],
    editorComponents: d.editorComponents ?? defaultEditorComponents,
    sidebars: (d.staticSidebars ?? []).map((sidebar) =>
      generateSidebar(concreteTypes, sidebar)
    ),
    rootCssClasses: [
      "activate-indent",
      "activate-block-outline",
      "activate-keyword",
    ],
  };

  // Create a visual representation for each concrete type
  const visualizedNodes: EditorBlockDescription[] = [];

  Object.entries(concreteTypes ?? {}).forEach(([langName, types]) => {
    const vis = Object.entries(types).map(
      ([name, typeDesc]): EditorBlockDescription => {
        return {
          describedType: { languageName: langName, typeName: name },
          // typeDesc must be a concrete description here
          visual: [
            visualizeNode(d, name, typeDesc as NodeConcreteTypeDescription),
          ],
        };
      }
    );

    visualizedNodes.push(...vis);
  });

  toReturn.editorBlocks = visualizedNodes;

  return toReturn;
}

const RELEVANT_ATTRIBUTES: ReadonlySet<string> = new Set([
  "property",
  "sequence",
  "allowed",
  "parentheses",
  "choice",
  "container",
]);

export function gatherAttributes(attributes: NodeAttributeDescription[]) {
  const impl = (
    attributes: NodeAttributeDescription[],
    collect: NodeAttributeDescription[]
  ) => {
    attributes
      .filter((a) => RELEVANT_ATTRIBUTES.has(a.type))
      .forEach((a) => {
        if (a.type === "container") {
          impl(a.children, collect);
        } else {
          collect.push(a);
        }
      });

    return collect;
  };

  return impl(attributes, []);
}

/**
 * Converts this whole node (and its attributes) to a JSON-inspired representation.
 */
export function visualizeNode(
  d: TreeBlockLanguageGeneratorDescription,
  name: string,
  t: NodeConcreteTypeDescription
): VisualBlockDescriptions.ConcreteBlock {
  const attributes = gatherAttributes(t.attributes).map((a) =>
    visualizeNodeAttributes(d, a)
  );
  const wrappedAttributes: VisualBlockDescriptions.EditorContainer[] =
    attributes.length > 0
      ? [
          {
            blockType: "container",
            orientation: "vertical",
            cssClasses: ["indent"],
            children: attributes,
          },
        ]
      : [];

  return {
    blockType: "block",
    children: [
      {
        blockType: "container",
        orientation: "vertical",
        children: [
          {
            blockType: "container",
            orientation: "horizontal",
            children: [
              {
                blockType: "constant",
                text: `node`,
                cssClasses: ["keyword", "space-after"],
              },
              {
                blockType: "constant",
                text: name,
                cssClasses: ["double-quote", "space-after"],
              },
              { blockType: "constant", text: `{` },
            ],
          },
          ...wrappedAttributes,
          { blockType: "constant", text: "}" },
        ],
      },
    ],
  };
}

export function visualizeNodeAttributes(
  d: TreeBlockLanguageGeneratorDescription,
  t: NodeAttributeDescription
): VisualBlockDescriptions.ConcreteBlock {
  switch (t.type) {
    case "property":
      return visualizeProperty(d, t);
    case "sequence":
    case "allowed":
    case "parentheses":
    case "choice":
      return visualizeChildGroup(d, t);
    case "container":
  }
}

export function visualizeChildGroup(
  _d: TreeBlockLanguageGeneratorDescription,
  t: NodeChildrenGroupDescription
): VisualBlockDescriptions.ConcreteBlock {
  return {
    blockType: "container",
    orientation: "vertical",
    children: [
      {
        blockType: "container",
        orientation: "horizontal",
        children: [
          {
            blockType: "constant",
            text: `children`,
            cssClasses: ["keyword", "space-after"],
          },
          {
            blockType: "constant",
            text: `${t.type} "${t.name}" : [`,
          },
        ],
      },
      {
        blockType: "container",
        orientation: "vertical",
        cssClasses: ["indent"],
        children: [
          {
            blockType: "iterator",
            childGroupName: t.name,
            ...(t.tags?.length ? { cssClasses: [...t.tags] } : {}),
          },
        ],
      },
      {
        blockType: "constant",
        text: `]`,
      },
    ],
  };
}

export function visualizeProperty(
  _d: TreeBlockLanguageGeneratorDescription,
  t: NodePropertyTypeDescription
): VisualBlockDescriptions.ConcreteBlock {
  return {
    blockType: "container",
    orientation: "horizontal",
    children: [
      {
        blockType: "constant",
        text: `prop`,
        cssClasses: ["keyword", "space-after"],
      },
      {
        blockType: "constant",
        text: t.name.trim(),
        cssClasses: ["double-quote"],
      },
      {
        blockType: "constant",
        text: ":",
        cssClasses: ["space-after"],
      },
      {
        blockType: "input",
        property: t.name,
      },
    ],
  };
}
