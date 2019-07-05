import { QualifiedTypeName, NodeDescription } from '../syntaxtree/syntaxtree.description'
import { Restricted } from './bool-mini-expression.description'

export type Orientation = "horizontal" | "vertical";

/**
 * Groups together all available options to describe a block in the
 * drag & drop UI.
 */
export namespace VisualBlockDescriptions {

  /**
   * These variables are available when evaluating drop target visibility.
   */
  export type VisibilityVars =
    "ifAnyDrag" | "ifLegalDrag" | "ifLegalChild" | "ifEmpty" | "ifChildrenRequired";

  /**
   * This expression is evaluated to determine whether a drop target should be shown.
   */
  export type VisibilityExpression = Restricted.Expression<VisibilityVars>;

  /**
   * We currently allow any CSS style to be used.
   *
   * TODO: This could be a Readonly<> type but that causes the JSON-
   * schema generator to (sort of rightfully) emit false for
   * "additionalProperties" and that in turn makes this type rather
   * pointless.
   */
  export type BlockStyle = { [k: string]: string };

  /**
   * Describes how certain nodes of the syntaxtree should be presented
   * inside the drag and drop editor. As the available blocks are very
   * different, this "base" interface consists of the discriminator value
   * and some properties that are applicable everywhere.
   */
  export interface EditorBlockBase {
    blockType: string;
    style?: BlockStyle;
    breakAfter?: boolean;
  }

  /**
   * These properties are required to specify drop targets.
   */
  export interface DropTargetProperties {
    visibility?: VisibilityExpression;
  }

  /**
   * Allows very basic control over the layout of blocks. This is meant
   * to be used for alignments in rows and columns, not for anything
   * involving actual design.
   */
  export interface EditorLayout extends EditorBlockBase {
    direction: Orientation;
    children?: ConcreteBlock[];
    wrapChildren?: boolean;
  }

  /**
   * An element that exists merely for layout purposes, think "div" or "span"
   */
  export interface EditorContainer extends EditorLayout {
    blockType: "container"
  }

  /**
   * Describes how a certain block should be represented. Blocks are
   * always draggable and also possible drop targets.
   */
  export interface EditorBlock extends EditorLayout {
    blockType: "block";
    dropTarget?: DropTargetProperties;
    dropAction?: "append" | "replace";
  }

  /**
   * Describes a "block" that only acts as a hole to drop things at.
   * It is not necesarily visible in every state and it is not draggable.
   */
  export interface EditorDropTarget extends EditorLayout {
    blockType: "dropTarget";
    dropTarget?: DropTargetProperties;
    // True, if a drop target should be shown even though an empty
    // child group is a perfectly valid syntax tree
    emptyDropTarget?: boolean;
  }

  /**
   * Allows to iterate over all blocks in a certain category.
   */
  export interface EditorIterator extends EditorLayout {
    blockType: "iterator";
    // The child group to iterate over
    childGroupName: string;
    between?: ConcreteBlock[];
    // True, if a drop marker should be shown even though an empty
    // child group is a perfectly valid syntax tree
    emptyDropTarget?: boolean;
  }

  /**
   * Displays a constant value that does not allow any user interaction.
   */
  export interface EditorConstant extends EditorBlockBase {
    blockType: "constant";
    text: string;
  }

  /**
   * Displays a dynamic value that depends on some property of the node but
   * does not allow to edit the property.
   */
  export interface EditorInterpolated extends EditorBlockBase {
    blockType: "interpolated";
    property: string;
  }

  /**
   * Displays an interpolated value and allows it to be edited.
   */
  export interface EditorInput extends EditorBlockBase {
    blockType: "input";
    // The property that is going to be edited
    property: string;
    // Some properties are not meant to be edited
    propReadOnly?: boolean;
  }

  /**
   * Shows a marker if there is some kind of error
   */
  export interface EditorErrorIndicator extends EditorBlockBase {
    blockType: "error";
    // Do not show the error marker for these errors
    excludedErrors?: string[];
  }

  export type ConcreteBlock = EditorContainer | EditorBlock | EditorDropTarget | EditorIterator | EditorConstant | EditorInterpolated | EditorInput | EditorErrorIndicator;

  export const DefaultDropTargetProperties: DropTargetProperties = {}

  // Type guard for EditorIterator
  export function isEditorIterator(obj?: EditorBlockBase): obj is EditorIterator {
    return (obj && obj.blockType === "iterator");
  }

  // Type guard for EditorBlock
  export function isEditorBlock(obj?: EditorBlockBase): obj is EditorBlock {
    return (obj && obj.blockType === "block");
  }
}

/**
 * Describes how the available types should be represented in the sidebar.
 * It is perfectly fine to have multiple sidebar descriptions for the
 * same underlying type.
 */
export interface SidebarBlockDescription {
  /**
   * The name to be displayed in the sidebar
   */
  displayName: string;

  /**
   * This description will be instanciated every time an "empty" node
   * is needed. This happens e.g. when the user starts dragging this
   * block from the sidebar.
   */
  defaultNode: NodeDescription | NodeDescription[];
}

/**
 * Defines which blocks to show in a certain category.
 */
export interface FixedBlocksSidebarCategoryDescription {
  categoryCaption: string;
  blocks: SidebarBlockDescription[];
}

/**
 * Defines the overall look of a sidebar. It at least sorts available blocks
 * into categories.
 */
export interface FixedBlocksSidebarDescription {
  /**
   * Unique identification for this type.
   */
  type: "fixedBlocks"

  /**
   * The name that should be displayed to the user.
   */
  caption: string

  /**
   * The actual blocks are categorized into categories.
   */
  categories: FixedBlocksSidebarCategoryDescription[]
}

export interface DatabaseSchemaSidebarDescription {
  /**
   * Unique identification for this type.
   */
  type: "databaseSchema"
}

export interface TruckProgramUserFunctionsSidebarDescription {
  /**
   * Unique identification for this type.
   */
  type: "truckProgramUserFunctions"
}

/**
 * All possible sidebar types
 */
export type SidebarDescription = FixedBlocksSidebarDescription
  | DatabaseSchemaSidebarDescription
  | TruckProgramUserFunctionsSidebarDescription;

/**
 * Describes how certain nodes in the syntaxtree should be presented
 * to an end user inside the drag & drop interface.
 */
export interface EditorBlockDescription {
  /**
   * Nodes of this type are presented using this block.
   */
  describedType: QualifiedTypeName;

  /**
   * The actual visual representation.
   */
  visual: VisualBlockDescriptions.ConcreteBlock[];
}
