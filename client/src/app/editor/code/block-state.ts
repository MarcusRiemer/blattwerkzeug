import {
  NodeDescription,
  NodeLocation,
  QualifiedTypeName,
  SyntaxTree,
  Validator,
} from "../../shared/syntaxtree";
import {
  FixedSidebarBlock,
  NodeDerivedPropertiesDescription,
  NodeTailoredDescription,
} from "../../shared/block";
import { _cardinalityAllowsInsertion } from "../../shared/syntaxtree/drop-util";

export type BlockState = "visible" | "invisible";

/**
 * Validates if the given block is a valid input for the given location
 *
 * @param block
 * @param validator
 * @param tree
 * @param loc this has to be the location of the clicked hole
 * @returns
 */
export function isLegalChild(
  block: FixedSidebarBlock | NodeDescription[] | NodeTailoredDescription[],
  validator: Validator,
  tree: SyntaxTree,
  loc: NodeLocation
) {
  if (!loc || loc.length === 0) {
    return true; // at the beginning everything should be visible
  }

  // Get the NodeTailoredDescription so the following logic can also be applied to databases and their comlumns
  if (isFixedSidebarBlock(block)) {
    block = block.defaultNode;
  }

  return block.some((block) => {
    try {
      const newNodeType: QualifiedTypeName = {
        languageName: block.language,
        typeName: block.name,
      };

      // If the tree is empty, the drop is always forbidden.
      // This happens if some block is rendered in the sidebar or as a dragged
      // block and the current tree is empty.
      if (!tree.isEmpty && isNodeDescription(block)) {
        const parentNode = tree.locate(loc.slice(0, -1));
        const parentNodeType = validator.getType(parentNode.qualifiedName);
        const [category, _index] = loc[loc.length - 1];

        return parentNodeType.allowsChildType(newNodeType, category);
      } else {
        console.debug(
          "Empty tree or block.defaultNode is not of type NodeDescription"
        );
        return false;
      }
    } catch (e) {
      console.warn("Failed to check for valid child", e);
      return true;
    }
  });
}

/**
 * Checks it the given block is of type FixedSidebarBlock
 * @param block
 * @returns
 */
function isFixedSidebarBlock(
  block: FixedSidebarBlock | NodeDescription[] | NodeTailoredDescription[]
): block is FixedSidebarBlock {
  return "defaultNode" in block;
}

/**
 * Checks if the given node is of type NodeDescription
 * @param node
 * @returns true if of type node description or false if of type NodeDerivedPropertiesDescription (TODO: Really?)
 */
export function isNodeDescription(
  node: NodeDescription | NodeDerivedPropertiesDescription
): node is NodeDescription {
  return "name" in node && "language" in node;
}
