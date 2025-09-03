import { NodeDescription, SyntaxTree } from "../syntaxtree";

import {
  FixedBlocksSidebarDescription,
  FixedBlocksSidebarCategoryDescription,
  SidebarBlockDescription,
  NodeTailoredDescription,
  isNodeDerivedPropertyDescription,
} from "./block.description";
import { Sidebar } from "./sidebar";
import { Observable } from "rxjs";
import { map, shareReplay } from "rxjs/operators";
import { CodeHighlightService } from "../../editor/code/code-highlight.service";

/**
 * Resolves all runtime derived values for a tailored node description. The
 * resulting node is a static and may be inserted to a tree.
 */
export function tailorBlockDescription(
  ast: SyntaxTree,
  proposal: NodeTailoredDescription
): NodeDescription {
  const properties: NodeDescription["properties"] = {};
  Object.entries(proposal.properties ?? []).forEach(([key, value]) => {
    if (typeof value === "string") {
      properties[key] = value;
    } else if (isNodeDerivedPropertyDescription(value)) {
      const node = ast.locateOrUndefined(value.loc);
      if (!node) {
        const path = JSON.stringify(value.loc);
        throw new Error(`Unknown path ${path}`);
      }
      const prop = node.properties[value.propName];
      if (typeof prop === "undefined") {
        const path = JSON.stringify(value.loc);
        const available = JSON.stringify(node.properties);
        throw new Error(
          `Node at ${path} has no property "${value.propName}", ` +
            `available properties are: ${available}`
        );
      }

      properties[key] = ast.locate(value.loc).properties[value.propName];
    }
  });

  // Construct the returned object and add all attributes that actually
  const toReturn: NodeDescription = {
    language: proposal.language,
    name: proposal.name,
  };

  if (proposal.children) {
    const newChildren = {};

    Object.entries(proposal.children).forEach(([catName, cat]) => {
      newChildren[catName] = cat.map((n) => tailorBlockDescription(ast, n));
    });

    toReturn.children = newChildren;
  }

  if (Object.keys(properties).length > 0) {
    toReturn.properties = properties;
  }

  return toReturn;
}

/**
 * This is how a certain type will be made availabe for the user
 * in the sidebar.
 */
export class FixedSidebarBlock {
  /**
   * The caption that is displayed for this block.
   */
  public readonly displayName: string;

  /**
   * @return The node that should be created when this block
   *         needs to be instanciated.
   */
  public readonly defaultNode: NodeTailoredDescription[];

  public readonly highlightState$: Observable<string>;

  constructor(
    desc: SidebarBlockDescription,
    codeHighlightService: CodeHighlightService
  ) {
    this.displayName = desc.displayName;

    this.highlightState$ = codeHighlightService.highlightedBlock$.pipe(
      map((highlighted) => highlighted === this.displayName),
      map((isHighlighted) => (isHighlighted ? "highlighted" : "neutral")),
      shareReplay(1)
    );

    if (Array.isArray(desc.defaultNode)) {
      this.defaultNode = desc.defaultNode;
    } else {
      this.defaultNode = [desc.defaultNode];
    }
  }

  tailoredBlockDescription(ast: SyntaxTree) {
    return this.defaultNode.map((b) => tailorBlockDescription(ast, b));
  }
}

/**
 * Groups together blocks.
 */
export interface BlocksSidebarCategory {
  readonly blocks: ReadonlyArray<FixedSidebarBlock>;
  readonly displayName: string;
}

export class FixedBlocksSidebarCategory implements BlocksSidebarCategory {
  /**
   * The caption that is displayed for this category.
   */
  public readonly displayName: string;

  public readonly blocks: ReadonlyArray<FixedSidebarBlock>;

  constructor(
    _parent: FixedBlocksSidebar,
    desc: FixedBlocksSidebarCategoryDescription,
    codeHighlightService: CodeHighlightService
  ) {
    this.displayName = desc.categoryCaption;
    this.blocks = desc.blocks.map(
      (blockDesc) => new FixedSidebarBlock(blockDesc, codeHighlightService)
    );
  }
}

/**
 * Groups together possible actions inside a sidebar. This is a
 * structure with three levels:
 * 1) Sidebar
 * 2) Category
 * 3) Block
 */
export class FixedBlocksSidebar implements Sidebar {
  readonly portalComponentTypeId = "fixedBlocks";

  /**
   * The caption that is displayed for this sidebar.
   */
  public readonly displayName: string;

  /**
   * The categories the blocks are sorted in to
   */
  public readonly categories: ReadonlyArray<BlocksSidebarCategory>;

  constructor(
    desc: FixedBlocksSidebarDescription,
    codeHighlightService: CodeHighlightService
  ) {
    this.displayName = desc.caption;
    this.categories = desc.categories.map((catDesc) => {
      return new FixedBlocksSidebarCategory(
        this,
        catDesc,
        codeHighlightService
      );
    });
  }
}
