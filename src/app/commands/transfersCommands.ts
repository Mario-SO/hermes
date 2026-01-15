import {
	cancelTransfer,
	getSelectedTransfer,
	getTransfersState,
	selectNextTransfer,
	selectPrevTransfer,
} from "@features/transfers/transfersState";
import { Effect } from "effect";
import type { CommandDefinition } from "./types";

export const transfersCommands = [
	{
		id: "transfers.selectNext",
		title: "Select Next",
		keys: ["j", "down"],
		layers: ["section:transfers"],
		when: (ctx) =>
			ctx.activeSection === "transfers" &&
			ctx.focusedPane === "main" &&
			getTransfersState().transfers.length > 0,
		run: () => selectNextTransfer,
	},
	{
		id: "transfers.selectPrev",
		title: "Select Previous",
		keys: ["k", "up"],
		layers: ["section:transfers"],
		when: (ctx) =>
			ctx.activeSection === "transfers" &&
			ctx.focusedPane === "main" &&
			getTransfersState().transfers.length > 0,
		run: () => selectPrevTransfer,
	},
	{
		id: "transfers.cancel",
		title: "Cancel Transfer",
		keys: ["x", "delete"],
		layers: ["section:transfers"],
		when: (ctx) => ctx.activeSection === "transfers",
		run: () =>
			Effect.gen(function* () {
				const transfer = getSelectedTransfer();
				if (!transfer) return;
				if (
					transfer.status === "pending" ||
					transfer.status === "in_progress"
				) {
					yield* cancelTransfer(transfer.id);
				}
			}),
	},
	{
		id: "transfers.verify",
		title: "Verify Hash",
		keys: ["v"],
		layers: ["section:transfers"],
		when: (ctx) => ctx.activeSection === "transfers",
		run: () =>
			Effect.sync(() => {
				const transfer = getSelectedTransfer();
				if (!transfer || transfer.status !== "completed") return;
				// TODO: Show hash verification modal
			}),
	},
] as const satisfies readonly CommandDefinition[];
