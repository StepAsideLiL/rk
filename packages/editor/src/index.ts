export {
  CONTROLLED_UPDATE_META,
  type BoundCommand,
  type BoundCommands,
  type CreateEditorOptions,
  type Editor,
  type EditorContent,
  type EditorContentType,
  type EditorEvents,
  type Unsubscribe,
} from "./core/create-editor";
export * from "./core/extension-manager";
export * from "./core/types";
export * from "./markdown/index";
export { createEditor } from "./editor";

/** Human-readable package name. */
export const EDITOR_NAME = "@rk/editor";
