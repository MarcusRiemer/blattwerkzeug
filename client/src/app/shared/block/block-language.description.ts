import {
  SidebarDescription,
  EditorBlockDescription,
} from "./block.description";
import { BlockLanguageGeneratorDocument } from "./generator/generator.description";

import { JsonApiListResponse } from "../serverdata/json-api-response";
import { QualifiedTypeName } from "../syntaxtree";

/**
 * Augments a language with information about the UI layer. This definition is
 * used by the editors, especially the block editor, to show customized editors
 * for different languages. These customizations include:
 *
 * * The blocks that are shown in the sidebar.
 * * Possibly language specific sidebars.
 * * Definitions of the actual blocks.
 * * Possibly language specific editor components.
 */
export interface BlockLanguageDescription
  extends BlockLanguageDocument,
    BlockLanguageListDescription {}

/**
 * Superficial information about a block language, usually used when loads of
 * block languages are queried together.
 */
export interface BlockLanguageListDescription {
  /**
   * The internal ID of this language model.
   */
  id: string;

  /**
   * The name that should be displayed to the user.
   */
  name: string;

  /**
   * A unique (but possibly empty) id. If this is undefined the language has
   * no builtin counterpart on the client.
   */
  slug?: string;

  /**
   * The programming language this block language uses by default.
   */
  defaultProgrammingLanguageId: string;

  /**
   * The ID of the block language that may have been used to generate this
   * block language.
   */
  blockLanguageGeneratorId?: string;

  /**
   * Didactically motivated restrictions that apply to this block language.
   */
  level?: BlockLanguageLevelDescription;

  /**
   * The grammar that this block language may visualize.
   */
  grammarId?: string;

  /**
   * Date & time this resource was created
   */
  createdAt?: string;

  /**
   * Date & time this resource was updated the last time
   */
  updatedAt?: string;
}

/**
 * Every component may define the following properties
 */
export interface EditorComponentBaseDescription {
  columnClasses?: string[];
}

/**
 * Displays the settings for a certain resource
 */
export interface CodeResourceSettingsComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "code-resource-settings";
}

/**
 * Displays the actual block editor
 */
export interface BlockRootComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "block-root";
}

/**
 * Displays a blockly editor
 */
export interface BlocklyComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "blockly";
}

/**
 * Displays a readonly JSON version of the AST
 */
export interface JsonAstComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "json-ast";
}

/**
 * Testcases for regular expressions.
 */
export interface RegexTestComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "regex-test";
}

/**
 * Executing JavaScript programs
 */
export interface ExecuteJavaScriptComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "execute-js";
}

/**
 * "Executing" JavaScript programs
 */
export interface ExecuteMathComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "execute-math";
}

/**
 * "Executing" Finite State Machines
 */
export interface ExecuteFiniteStateMachineComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "execute-fsm";
}

/**
 * Displays debug information about an ongoing drag process
 */
export interface DropDebugComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "drop-debug";
}

/**
 * Displays (limited) results of SQL-queries
 */
export interface QueryPreviewComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "query-preview";
}

/**
 * Displays validation results
 */
export interface ValidatorComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "validator";
}

/**
 * Displays an ai-coach
 */
export interface AiCoachComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "ai-coach";
}

/**
 * Displays the assignment
 */
export interface AssignmentComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "assignment";
}

/**
 * Displays the compiled program
 */
export interface CodeGeneratorComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "generated-code";
}

/**
 * Displays a truck world
 */
export interface TruckWorldComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "truck-world";
}

/**
 * Displays a truck controller
 */
export interface TruckControllerComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "truck-controller";
}

/**
 * Displays a trucks sensors
 */
export interface TruckSensorsComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "truck-sensors";
}

/**
 * The world settings and tile selector for truck worlds
 */
export interface TruckWorldEditorMenuComponentDescription
  extends EditorComponentBaseDescription {
  componentType: "truck-world-editor";
}

/**
 * Restricts types that are available in a block language
 */
export interface BlockLanguageLevelDescription {
  type: "blackList" | "whiteList";
  levelTypes: QualifiedTypeName[];
}

/**
 * Any component that could be displayed in the actual editor view.
 */
export type EditorComponentDescription =
  | CodeResourceSettingsComponentDescription
  | BlockRootComponentDescription
  | BlocklyComponentDescription
  | QueryPreviewComponentDescription
  | ValidatorComponentDescription
  | AiCoachComponentDescription
  | AssignmentComponentDescription
  | CodeGeneratorComponentDescription
  | TruckWorldComponentDescription
  | TruckControllerComponentDescription
  | TruckSensorsComponentDescription
  | TruckWorldEditorMenuComponentDescription
  | DropDebugComponentDescription
  | JsonAstComponentDescription
  | RegexTestComponentDescription
  | ExecuteJavaScriptComponentDescription
  | ExecuteMathComponentDescription
  | ExecuteFiniteStateMachineComponentDescription;

export type BlockLanguageSidebarsDescription = SidebarDescription[];

export type BlockLanguageEditorComponentsDescription =
  EditorComponentDescription[];

export type BlockLanguageEditorBlocksDescription = EditorBlockDescription[];

/**
 * The data about a language model that is stored in the database
 */
export interface BlockLanguageDocument {
  /**
   * How the available blocks should be represented in the sidebar.
   */
  sidebars: BlockLanguageSidebarsDescription;

  /**
   * How blocks should be represented in the drag & drop editor.
   */
  editorBlocks: BlockLanguageEditorBlocksDescription;

  /**
   * Specialised components that should be shown for this block
   * language.
   */
  editorComponents: BlockLanguageEditorComponentsDescription;

  /**
   * Information on how to (re)-generate this block language.
   */
  localGeneratorInstructions?: BlockLanguageGeneratorDocument;

  /**
   * CSS classes that should be applied at the root
   */
  rootCssClasses: string[];
}

/**
 * The server hands out additional information that is only used for display purposes.
 */
export interface BlockLanguageListItemDescription
  extends BlockLanguageListDescription {
  generated: boolean;
}

export type BlockLanguageListResponseDescription =
  JsonApiListResponse<BlockLanguageListItemDescription>;

export function isBlockLanguageDescription(
  obj: any
): obj is BlockLanguageDescription {
  return "id" in obj && "name" in obj && "defaultProgrammingLanguageId" in obj;
}
