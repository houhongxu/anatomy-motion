import type { Group } from "./types";
export type AtlasSelection =
  | { kind: "structure"; id: string }
  | { kind: "group"; group: Group }
  | { kind: "point"; id: string }
  | undefined;
export type SelectionAction =
  | { type: "structure"; id: string; toggle?: boolean }
  | { type: "group"; group: Group }
  | { type: "point"; id: string }
  | { type: "clear" };
export function selectionStructureIds(selection: AtlasSelection): string[] {
  return selection?.kind === "group"
    ? selection.group.structureIds
    : selection?.kind === "structure"
      ? [selection.id]
      : [];
}
export function selectionReducer(
  selection: AtlasSelection,
  action: SelectionAction,
): AtlasSelection {
  if (action.type === "clear") return undefined;
  if (action.type === "structure") {
    if (
      action.toggle &&
      selection?.kind === "structure" &&
      selection.id === action.id
    )
      return undefined;
    return { kind: "structure", id: action.id };
  }
  if (action.type === "point") return { kind: "point", id: action.id };
  return { kind: "group", group: action.group };
}
export const wholeBodyScope = {
  region: "all",
  superficial: true,
  deep: false,
} as const;

export type ExplorerTab = "atlas" | "learning" | "records";
export type DirectoryKind = "exercise" | "condition" | "structures" | "points";
export type ExplorerState = {
  tab: ExplorerTab;
  directory: DirectoryKind;
  selection: AtlasSelection;
};
export const initialExplorerState: ExplorerState = {
  tab: "atlas",
  directory: "exercise",
  selection: undefined,
};
export type ExplorerAction =
  | { type: "tab"; tab: ExplorerTab }
  | { type: "directory"; directory: DirectoryKind }
  | { type: "selection"; action: SelectionAction; openAtlas?: boolean };
export function explorerReducer(
  state: ExplorerState,
  action: ExplorerAction,
): ExplorerState {
  if (action.type === "tab") return { ...state, tab: action.tab };
  if (action.type === "directory")
    return { ...state, directory: action.directory };
  return {
    ...state,
    tab: action.openAtlas ? "atlas" : state.tab,
    selection: selectionReducer(state.selection, action.action),
  };
}
