import {
	navigateNext,
	navigatePrev,
	navigateTo,
} from "@features/navigation/navigationState";
import type { CommandDefinition } from "./types";

export const navigationCommands = [
	{
		id: "nav.next",
		title: "Next Section",
		keys: ["j", "down"],
		layers: ["global"],
		when: (ctx) => ctx.focusedPane === "navigation",
		run: () => navigateNext,
	},
	{
		id: "nav.prev",
		title: "Previous Section",
		keys: ["k", "up"],
		layers: ["global"],
		when: (ctx) => ctx.focusedPane === "navigation",
		run: () => navigatePrev,
	},
	{
		id: "nav.identity",
		title: "Go to Identity",
		keys: ["1"],
		layers: ["global"],
		run: () => navigateTo("identity"),
	},
	{
		id: "nav.peers",
		title: "Go to Peers",
		keys: ["2"],
		layers: ["global"],
		run: () => navigateTo("peers"),
	},
	{
		id: "nav.activity",
		title: "Go to Activity",
		keys: ["3"],
		layers: ["global"],
		run: () => navigateTo("activity"),
	},
] as const satisfies readonly CommandDefinition[];
