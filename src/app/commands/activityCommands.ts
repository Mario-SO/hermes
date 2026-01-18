import { join } from "node:path";
import {
	getActivityItemData,
	getSelectedActivity,
	selectNextActivityItem,
	selectPrevActivityItem,
} from "@features/activity/activityState";
import {
	openDecryptFileModal,
	openSaveLocationModal,
} from "@features/overlays/modalState";
import { showToast } from "@features/overlays/toastState";
import {
	getReceiveState,
	removeIncomingRequest,
	startListening,
	stopListening,
} from "@features/receive/receiveState";
import { cancelTransfer } from "@features/transfers/transfersState";
import { Effect } from "effect";
import type { CommandDefinition } from "./types";

const getResolvedFilePath = (fileName: string, filePath?: string): string => {
	if (filePath) return filePath;
	return join(getReceiveState().defaultSavePath, fileName);
};

const hashFileSha256 = (filePath: string) =>
	Effect.tryPromise({
		try: async () => {
			const file = Bun.file(filePath);
			const exists = await file.exists();
			if (!exists) {
				throw new Error("File not found.");
			}

			const hasher = new Bun.CryptoHasher("sha256");
			const reader = file.stream().getReader();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (value) hasher.update(value);
			}
			return hasher.digest("hex");
		},
		catch: (error) =>
			error instanceof Error ? error : new Error(String(error)),
	});

const hasSelectedRequest = (): boolean => {
	const selected = getActivityItemData(getSelectedActivity());
	return selected?.kind === "request";
};

const hasSelectedTransfer = (): boolean => {
	const selected = getActivityItemData(getSelectedActivity());
	return selected?.kind === "transfer";
};

export const activityCommands = [
	{
		id: "activity.toggleListening",
		title: "Toggle Receive",
		keys: ["r"],
		layers: ["global", "section:activity"],
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
		id: "activity.stopListening",
		title: "Stop Listening",
		keys: ["escape"],
		layers: ["section:activity"],
		when: (ctx) => ctx.activeSection === "activity" && ctx.isListening,
		run: () => stopListening,
	},
	{
		id: "activity.selectNext",
		title: "Select Next",
		keys: ["j", "down"],
		layers: ["section:activity"],
		when: (ctx) =>
			ctx.activeSection === "activity" && ctx.focusedPane === "main",
		run: () => selectNextActivityItem,
	},
	{
		id: "activity.selectPrev",
		title: "Select Previous",
		keys: ["k", "up"],
		layers: ["section:activity"],
		when: (ctx) =>
			ctx.activeSection === "activity" && ctx.focusedPane === "main",
		run: () => selectPrevActivityItem,
	},
	{
		id: "activity.acceptRequest",
		title: "Accept Request",
		keys: ["return", "y"],
		layers: ["section:activity"],
		when: (ctx) => ctx.activeSection === "activity" && hasSelectedRequest(),
		run: () =>
			Effect.gen(function* () {
				const selected = getActivityItemData(getSelectedActivity());
				if (!selected || selected.kind !== "request") return;
				yield* openSaveLocationModal(selected.request);
			}),
	},
	{
		id: "activity.declineRequest",
		title: "Decline Request",
		keys: ["d", "n"],
		layers: ["section:activity"],
		when: (ctx) => ctx.activeSection === "activity" && hasSelectedRequest(),
		run: () =>
			Effect.gen(function* () {
				const selected = getActivityItemData(getSelectedActivity());
				if (!selected || selected.kind !== "request") return;
				yield* removeIncomingRequest(selected.request.id);
			}),
	},
	{
		id: "activity.cancelTransfer",
		title: "Cancel Transfer",
		keys: ["x", "delete"],
		layers: ["section:activity"],
		when: (ctx) => ctx.activeSection === "activity" && hasSelectedTransfer(),
		run: () =>
			Effect.gen(function* () {
				const selected = getActivityItemData(getSelectedActivity());
				if (!selected || selected.kind !== "transfer") return;
				if (
					selected.transfer.status === "pending" ||
					selected.transfer.status === "in_progress"
				) {
					yield* cancelTransfer(selected.transfer.id);
				}
			}),
	},
	{
		id: "activity.decryptFile",
		title: "Decrypt File",
		keys: ["d"],
		layers: ["section:activity"],
		when: (ctx) => ctx.activeSection === "activity" && hasSelectedTransfer(),
		run: () =>
			Effect.gen(function* () {
				const selected = getActivityItemData(getSelectedActivity());
				if (!selected || selected.kind !== "transfer") return;
				if (selected.transfer.status !== "completed") {
					yield* showToast({
						tone: "warning",
						message: "Only completed transfers can be decrypted.",
					});
					return;
				}
				if (selected.transfer.direction !== "receive") {
					yield* showToast({
						tone: "warning",
						message: "Decrypt works only for received files.",
					});
					return;
				}

				const filePath = getResolvedFilePath(
					selected.transfer.fileName,
					selected.transfer.filePath,
				);

				yield* openDecryptFileModal({
					fileName: selected.transfer.fileName,
					filePath,
				});
			}),
	},
	{
		id: "activity.verifyHash",
		title: "Verify Hash",
		keys: ["v"],
		layers: ["section:activity"],
		when: (ctx) => ctx.activeSection === "activity" && hasSelectedTransfer(),
		run: () =>
			Effect.gen(function* () {
				const selected = getActivityItemData(getSelectedActivity());
				if (!selected || selected.kind !== "transfer") return;
				if (selected.transfer.status !== "completed") {
					yield* showToast({
						tone: "warning",
						message: "Hash verification requires a completed transfer.",
					});
					return;
				}
				if (!selected.transfer.hash) {
					yield* showToast({
						tone: "warning",
						message: "No hash available for this transfer.",
					});
					return;
				}

				const filePath = getResolvedFilePath(
					selected.transfer.fileName,
					selected.transfer.filePath,
				);

				const computed = yield* hashFileSha256(filePath).pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							yield* showToast({
								tone: "error",
								message: error.message,
							});
							return null;
						}),
					),
				);
				if (!computed) return;

				if (computed.toLowerCase() === selected.transfer.hash.toLowerCase()) {
					yield* showToast({
						tone: "success",
						message: "Hash verified.",
					});
					return;
				}

				yield* showToast({
					tone: "error",
					message: "Hash mismatch.",
				});
			}),
	},
] as const satisfies readonly CommandDefinition[];
