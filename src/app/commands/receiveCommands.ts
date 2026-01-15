import { openSaveLocationModal } from "@features/overlays/modalState";
import {
	getSelectedRequest,
	removeIncomingRequest,
	selectNextRequest,
	selectPrevRequest,
	startListening,
	stopListening,
} from "@features/receive/receiveState";
import { Effect } from "effect";
import type { CommandDefinition } from "./types";

export const receiveCommands = [
	{
		id: "receive.toggle",
		title: "Toggle Receive",
		keys: ["r"],
		layers: ["global", "section:receive"],
		when: (ctx) => ctx.hasIdentity,
		run: (ctx) =>
			Effect.gen(function* () {
				if (ctx.isListening) {
					yield* stopListening;
				} else {
					yield* startListening;
				}
			}),
	},
	{
		id: "receive.stop",
		title: "Stop Listening",
		keys: ["escape"],
		layers: ["section:receive"],
		when: (ctx) => ctx.activeSection === "receive" && ctx.isListening,
		run: () => stopListening,
	},
	{
		id: "receive.selectNext",
		title: "Select Next",
		keys: ["j", "down"],
		layers: ["section:receive"],
		when: (ctx) =>
			ctx.activeSection === "receive" &&
			ctx.focusedPane === "main" &&
			ctx.isListening,
		run: () => selectNextRequest,
	},
	{
		id: "receive.selectPrev",
		title: "Select Previous",
		keys: ["k", "up"],
		layers: ["section:receive"],
		when: (ctx) =>
			ctx.activeSection === "receive" &&
			ctx.focusedPane === "main" &&
			ctx.isListening,
		run: () => selectPrevRequest,
	},
	{
		id: "receive.accept",
		title: "Accept Request",
		keys: ["return", "y"],
		layers: ["section:receive"],
		when: (ctx) => ctx.activeSection === "receive" && ctx.isListening,
		run: () =>
			Effect.gen(function* () {
				const request = getSelectedRequest();
				if (!request) return;
				yield* openSaveLocationModal(request);
			}),
	},
	{
		id: "receive.decline",
		title: "Decline Request",
		keys: ["d", "n"],
		layers: ["section:receive"],
		when: (ctx) => ctx.activeSection === "receive" && ctx.isListening,
		run: () =>
			Effect.gen(function* () {
				const request = getSelectedRequest();
				if (!request) return;
				yield* removeIncomingRequest(request.id);
			}),
	},
	{
		id: "receive.changePath",
		title: "Change Save Path",
		keys: ["p"],
		layers: ["section:receive"],
		when: (ctx) => ctx.activeSection === "receive",
		run: () =>
			Effect.sync(() => {
				// TODO: Open path picker
			}),
	},
] as const satisfies readonly CommandDefinition[];
