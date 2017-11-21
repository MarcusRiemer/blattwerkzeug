import { QualifiedTypeName, NodeDescription } from '../syntaxtree'

/**
 * Groups together all available options to describe a block in the
 * drag & drop UI.
 */
export namespace EditorBlockDescriptions {
  /**
   * Describes how certain nodes of the syntaxtree should be presented
   * inside the drag and drop editor. As the available blocks are very
   * different, this "base" interface
   */
  export interface EditorBlockBase {
    blockType: string;
  }

  /**
   * Describes how a certain block should be represented. Blocks are
   * always draggable and also possible drop targets.
   *
   * Whether this block is displayed inline or as a whole block depends
   * on two things:
   * 1) Blocks may have a preference how to be represented themself.
   * 2) The parent of a block may know best how it should be represented.
   */
  export interface EditorBlock extends EditorBlockBase {
    blockType: "block";
    children: EditorBlockBase[];
  }

  /**
   * Allows to iterate over all blocks in a certain category.
   */
  export interface EditorIterator extends EditorBlockBase {
    blockType: "iterator";
    childGroupName: string;
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
  export interface EditorInterpolation extends EditorBlockBase {
    blockType: "interpolated";
    property: string;
  }
}

/**
 * Describes how the available types should be represented in the sidebar.
 * It is perfectly fine to have multiple sidebar descriptions for the
 * same underlying type.
 */
export interface SidebarBlockDescription {
  /**
   * This type is made available via this description.
   */
  describedType: QualifiedTypeName;

  /**
   * How this type should be represented in the sidebar.
   */
  sidebar: {
    category: string;
    displayName?: string;
  };

  /**
   * This description will be instanciated every time an "empty" node
   * is needed. This happens e.g. when the user starts dragging this
   * block from the sidebar.
   */
  defaultNode: NodeDescription;
}

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
  visual: EditorBlockDescriptions.EditorBlockBase[];
}
