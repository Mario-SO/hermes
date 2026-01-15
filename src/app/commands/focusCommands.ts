import { focusNextPane, focusPrevPane } from "@features/focus/focusState";
import type { CommandDefinition } from "./types";

export const focusCommands = [
	{
		id: "focus.nextPane",
		title: "Next Pane",
		keys: [{ key: "tab", preventDefault: true }],
		layers: ["global"],
		when: (ctx) => ctx.modalType === "none",
		run: () => focusNextPane,
	},
	{
		id: "focus.prevPane",
		title: "Previous Pane",
		keys: [{ key: "shift+tab", preventDefault: true }],
		layers: ["global"],
		when: (ctx) => ctx.modalType === "none",
		run: () => focusPrevPane,
	},
] as const satisfies readonly CommandDefinition[];
