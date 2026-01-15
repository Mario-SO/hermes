import { closeModal, openModal } from "@features/overlays/modalState";
import { Effect } from "effect";
import { renderer, root } from "../renderer";
import type { CommandDefinition } from "./types";

export const appCommands = [
	{
		id: "app.quit",
		title: "Quit",
		keys: ["q"],
		layers: ["global"],
		run: () =>
			Effect.sync(() => {
				root?.unmount();
				renderer.stop?.();
				renderer.destroy?.();
				process.exit(0);
			}),
	},
	{
		id: "app.help",
		title: "Help",
		keys: ["?"],
		layers: ["global"],
		run: () =>
			Effect.sync(() => {
				// TODO: Show help modal
			}),
	},
	{
		id: "modal.close",
		title: "Close",
		keys: ["escape"],
		layers: [
			"modal:add_peer",
			"modal:trust_peer",
			"modal:select_file",
			"modal:encryption_options",
			"modal:confirm_send",
			"modal:receive_request",
			"modal:save_location",
			"modal:error",
		],
		run: () => closeModal,
	},
	{
		id: "modal.confirm",
		title: "Confirm",
		keys: ["return"],
		layers: [
			"modal:add_peer",
			"modal:trust_peer",
			"modal:select_file",
			"modal:encryption_options",
			"modal:confirm_send",
			"modal:receive_request",
			"modal:save_location",
		],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.modal?.confirm();
			}),
	},
	{
		id: "modal.nextField",
		title: "Next Field",
		keys: ["tab"],
		layers: ["modal:add_peer", "modal:encryption_options"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.modal?.nextField();
			}),
	},
	{
		id: "modal.prevField",
		title: "Previous Field",
		keys: ["shift+tab"],
		layers: ["modal:add_peer", "modal:encryption_options"],
		run: (ctx) =>
			Effect.sync(() => {
				ctx.modal?.prevField();
			}),
	},
	{
		id: "app.addPeer",
		title: "Add Peer",
		keys: ["a"],
		layers: ["global"],
		when: (ctx) => ctx.hasIdentity,
		run: () => openModal("add_peer"),
	},
	{
		id: "app.sendFile",
		title: "Send File",
		keys: ["s"],
		layers: ["global"],
		when: (ctx) => ctx.hasIdentity,
		run: () => openModal("select_file"),
	},
] as const satisfies readonly CommandDefinition[];
