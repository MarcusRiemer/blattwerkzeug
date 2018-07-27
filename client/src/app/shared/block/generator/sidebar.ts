import {
  NodeDescription, NodeAttributeDescription,
  NodePropertyTypeDescription, NodeChildrenGroupDescription, GrammarDocument
} from '../../syntaxtree/'
import { FullNodeConcreteTypeDescription } from '../../syntaxtree/grammar-util.description'
import {
  SidebarDescription, SidebarBlockDescription, FixedBlocksSidebarCategoryDescription
} from '../block.description'
import {
  AnySidebarDescription, AnySidebarBlockDescription, ConstantSidebarBlockDescription,
  AnySidebarCategoryDescription, ConstantBlocksSidebarCategoryDescription
} from './sidebar.description';
import { fullNodeDescription } from '../../syntaxtree/grammar-util';

// These values for "type" refer to a child group
const CHILD_GROUP_TYPES = new Set<NodeAttributeDescription["type"]>(
  ["sequence", "allowed", "choice"]
);

/**
 * Calculates a default value that has at least a type that matches the given type.
 * This value will hopefully satisfy the type, but further restrictions may hinder
 * this.
 */
export function generateDefaultValue(propertyType: NodePropertyTypeDescription) {
  switch (propertyType.base) {
    case "boolean":
      return ("false");
    case "integer":
      return ("0");
    case "string":
      return ("");
  }
}

/**
 * A wild guess to create a meaningful default node if only the type
 * of a node is given.
 */
export function generateDefaultNode(nodeType: FullNodeConcreteTypeDescription): NodeDescription {
  // Minimal requirement: Referenced type
  const toReturn: NodeDescription = {
    name: nodeType.typeName,
    language: nodeType.languageName
  };

  // Are there any attributes that require mapping?
  if (nodeType.attributes) {
    // Are there any child categories that are required? For the moment
    // we simply assume that a mentioned group is also required
    const requiredChildrenCategories = nodeType.attributes
      .filter(a => CHILD_GROUP_TYPES.has(a.type)) as NodeChildrenGroupDescription[];

    if (requiredChildrenCategories.length > 0) {
      toReturn.children = {};
      requiredChildrenCategories.forEach(childCategory => {
        toReturn.children[childCategory.name] = [];
      });
    }

    // Assign default values for properties
    const properties = nodeType.attributes
      .filter(a => a.type === "property") as NodePropertyTypeDescription[];

    if (properties.length > 0) {
      toReturn.properties = {};
      properties.forEach(p => {
        toReturn.properties[p.name] = generateDefaultValue(p);
      });
    }
  }

  return (toReturn);
}

/**
 * Generates a concrete block that is draggable and shal be shown on its own.
 */
export function generateSidebarBlock(
  grammar: GrammarDocument,
  block: AnySidebarBlockDescription
): SidebarBlockDescription {
  if (block.type === "constant") {
    // Ensure that there is no superflous "type" property on the description
    // that we return.
    const toReturn: ConstantSidebarBlockDescription = JSON.parse(JSON.stringify(block));
    delete toReturn.type;
    return (toReturn);
  } else {
    const nodeType = fullNodeDescription(grammar, block.nodeType);
    const toReturn: SidebarBlockDescription = {
      displayName: block.displayName || block.nodeType.typeName,
      defaultNode: generateDefaultNode(nodeType)
    }

    return (toReturn);
  }
}

/**
 * Generates all blocks in this sidebar category.
 */
export function generateSidebarCategory(
  grammar: GrammarDocument,
  category: AnySidebarCategoryDescription
): FixedBlocksSidebarCategoryDescription {
  // Pass through or generate?
  if (category.type === "constant") {
    // Ensure that there is no superflous "type" property on the description
    // that we return.
    const toReturn: ConstantBlocksSidebarCategoryDescription = JSON.parse(JSON.stringify(category));
    delete toReturn.type;
    return (toReturn);
  } else {
    // Generate relevant blocks
    const toReturn: FixedBlocksSidebarCategoryDescription = {
      categoryCaption: category.categoryCaption,
      blocks: category.blocks.map(b => generateSidebarBlock(grammar, b))
    };

    return (toReturn);
  }
}

/**
 * Takes the given sidebar and ensures that it only contains static
 * information.
 */
export function generateSidebar(
  grammar: GrammarDocument,
  desc: AnySidebarDescription
): SidebarDescription {
  // Is there anything to generate?
  if (desc.type === "generatedBlocks") {
    return ({
      type: "fixedBlocks",
      caption: desc.caption,
      categories: desc.categories.map(category => generateSidebarCategory(grammar, category))
    });
  } else {
    // No, just return the sidebar as it is.
    return (desc);
  }
}