import { NodeLocation, SyntaxNode, SyntaxTree } from "./syntaxtree";
import { Selector } from "./transform.description";

function doesNodeMatchSelector(node: SyntaxNode, selector: Selector): boolean {
  let to_return = true;
  switch (selector.kind) {
    case "root":
      if (node.nodeParent === undefined) return true;
      else return false;
    case "type":
      const nodeQualifiedName = node.qualifiedName;
      if (selector.name) {
        to_return = to_return && node.qualifiedName.typeName === selector.name;
      }
      if (selector.language) {
        to_return =
          to_return && node.qualifiedName.languageName === selector.language;
      }
      if (selector.hasChildGroup) {
        to_return =
          to_return &&
          node.childrenCategoryNames.includes(selector.hasChildGroup);
      }
      return to_return;
    default:
      return false;
  }
}

/**
 * Takes a syntax tree's root and a selector and give back a list of Matches.
 * Matching is done using a DFS algorithm for visiting all nodes of the trees.
 * @param inp Represents the input syntax tree that is to be searched through
 * @param selector Represents to selector that should be matched against
 * @return a list of locations for the nodes that matched.
 */

export function findMatches(
  inp: SyntaxNode,
  selector: Selector
): NodeLocation[] {
  let to_return: NodeLocation[] = [];
  const subtreeRootNode = inp;

  // Recursively apply to all children
  if (subtreeRootNode.hasChildren) {
    subtreeRootNode.childrenCategoryNames.forEach((category) => {
      let children = subtreeRootNode.getChildrenInCategory(category);
      children.forEach((child) => {
        to_return.push(...findMatches(child, selector));
      });
    });
  }

  // Does the current root node match?
  if (doesNodeMatchSelector(subtreeRootNode, selector)) {
    to_return.push(subtreeRootNode.location);
  }

  return to_return;
}
