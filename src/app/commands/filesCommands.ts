import { join } from "node:path";
import { openDecryptFileModal } from "@features/overlays/modalState";
import { showToast } from "@features/overlays/toastState";
import { getReceiveState } from "@features/receive/receiveState";
import {
	getSelectedTransfer,
	getTransfersState,
	selectNextTransfer,
	selectPrevTransfer,
} from "@features/transfers/transfersState";
import { Effect } from "effect";
import type { CommandDefinition } from "./types";

const getResolvedFilePath = (fileName: string, filePath?: string): string => {
	if (filePath) return filePath;
	return join(getReceiveState().defaultSavePath, fileName);
};

export const filesCommands = [
	{
		id: "files.selectNext",
		title: "Select Next",
		keys: ["j", "down"],
		layers: ["section:files"],
		when: (ctx) =>
			ctx.activeSection === "files" &&
			ctx.focusedPane === "main" &&
			getTransfersState().transfers.length > 0,
		run: () => selectNextTransfer,
	},
	{
		id: "files.selectPrev",
		title: "Select Previous",
		keys: ["k", "up"],
		layers: ["section:files"],
		when: (ctx) =>
			ctx.activeSection === "files" &&
			ctx.focusedPane === "main" &&
			getTransfersState().transfers.length > 0,
		run: () => selectPrevTransfer,
	},
	{
		id: "files.decrypt",
		title: "Decrypt File",
		keys: ["d"],
		layers: ["section:files"],
		when: (ctx) => ctx.activeSection === "files",
		run: () =>
			Effect.gen(function* () {
				const transfer = getSelectedTransfer();
				if (!transfer) {
					yield* showToast({
						tone: "warning",
						message: "Select a file to decrypt.",
					});
					return;
				}
				if (transfer.status !== "completed") {
					yield* showToast({
						tone: "warning",
						message: "Only completed transfers can be decrypted.",
					});
					return;
				}
				if (transfer.direction !== "receive") {
					yield* showToast({
						tone: "warning",
						message: "Decrypt works only for received files.",
					});
					return;
				}

				const filePath = getResolvedFilePath(
					transfer.fileName,
					transfer.filePath,
				);

				yield* openDecryptFileModal({
					fileName: transfer.fileName,
					filePath,
				});
			}),
	},
] as const satisfies readonly CommandDefinition[];
