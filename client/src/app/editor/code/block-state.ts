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
} from "../../shared/block";
import { _cardinalityAllowsInsertion } from "../../shared/syntaxtree/drop-util";

export type BlockState = "visible" | "invisible";
// TODO: Expand for DatabaseSchema

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
  block: FixedSidebarBlock,
  validator: Validator,
  tree: SyntaxTree,
  loc: NodeLocation
) {
  if (!loc || loc.length === 0) {
    return true; // at the beginning everything should be visible
  }

  return block.defaultNode.some((block) => {
    try {
      const newNodeType: QualifiedTypeName = {
        languageName: block.language,
        typeName: block.name,
      };

      const locArray = Object.values(loc);

      console.log("Loc", loc);
      console.log("LocArray", locArray);
      // If the tree is empty, the drop is always forbidden.
      // This happens if some block is rendered in the sidebar or as a dragged
      // block and the current tree is empty.
      if (!tree.isEmpty && isNodeDescription(block)) {
        const parentNode = tree.locate(locArray.slice(0, -1));
        const parentNodeType = validator.getType(parentNode.qualifiedName);
        const [category, index] = locArray[locArray.length - 1];

        return (
          parentNodeType.allowsChildType(
            newNodeType,
            dropLocationChildGroupName(locArray)
          ) &&
          _cardinalityAllowsInsertion(
            validator,
            parentNode,
            block,
            category,
            index
          )
        );
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
 * @return The name of the referenced child group (if there is any)
 */
function dropLocationChildGroupName(loc: NodeLocation): string {
  return loc[loc.length - 1][0];
}

/**
 * Checks if the given node is of type NodeDescription
 * @param node
 * @returns true if of type node description or false if of type NodeDerivedPropertiesDescription (TODO: Really?)
 */
function isNodeDescription(
  node: NodeDescription | NodeDerivedPropertiesDescription
): node is NodeDescription {
  return "name" in node && "language" in node;
}
