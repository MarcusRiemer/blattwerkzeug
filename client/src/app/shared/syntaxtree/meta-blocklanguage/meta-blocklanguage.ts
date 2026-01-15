import { BlockLanguageDescription } from "../../block/block-language.description";
import { SyntaxTree } from "../syntaxtree";

import { NodeDescription } from "../syntaxtree.description";

export type BlockLanguageSettings = Partial<
  Pick<
    BlockLanguageDescription,
    "rootCssClasses" | "editorComponents" | "sidebars"
  >
>;

export function readFromNode(
  node: NodeDescription | SyntaxTree,
  _throwOnError = false
): BlockLanguageSettings {
  const tree = node instanceof SyntaxTree ? node : new SyntaxTree(node);

  const rootCssClasses = tree.rootNode
    .getChildrenInCategory("RootCssClasses")
    .map((cssNode) => cssNode.properties["Name"]);

  const toReturn: ReturnType<typeof readFromNode> = {
    rootCssClasses,
  };

  const editorComponents = tree.rootNode.getChildInCategory("EditorComponents");
  if (editorComponents) {
    const values = editorComponents
      .getChildrenInCategory("Values")
      .map((compNode) => ({
        componentType: compNode.properties["Name"] as any,
      }));

    if (values.length > 0) {
      toReturn.editorComponents = values;
    }
  }

  return toReturn;
}
