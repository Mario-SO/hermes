import { setModalCommandHandlers } from "@app/commands/context";
import { closeModal, useModalState } from "@features/overlays/modalState";
import { getSelectedPeer } from "@features/peers/peersState";
import { useTheme } from "@features/theme/themeState";
import {
	addTransfer,
	completeTransfer,
	failTransfer,
	updateTransfer,
	updateTransferProgress,
} from "@features/transfers/transfersState";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import { zenc, zend } from "@shared/ipc";
import type { Transfer } from "@shared/types";
import { Effect } from "effect";
import { useCallback, useEffect } from "react";

export function ConfirmSendModal() {
	const ui = useTheme().ui;
	const modalState = useModalState();
	const sendData = modalState.data as
		| { filePath: string; encryptionMode: string; password?: string }
		| undefined;

	const { width, height } = useModalDimensions({
		minWidth: 50,
		widthPercent: 0.5,
		maxWidthPercent: 0.7,
		minHeight: 14,
		heightPercent: 0.35,
		maxHeightPercent: 0.5,
	});

	const peer = getSelectedPeer();
	const fileName = sendData?.filePath?.split("/").pop() ?? "Unknown";

	const handleConfirm = useCallback(() => {
		if (!peer || !sendData) return;

		const transferId = `transfer-${Date.now()}`;
		const transfer: Transfer = {
			id: transferId,
			direction: "send",
			peerId: peer.id,
			fileName,
			fileSize: 0, // Will be populated by IPC
			filePath: sendData.filePath,
			progress: 0,
			status: "pending",
			startedAt: new Date(),
		};

		Effect.runPromise(addTransfer(transfer));
		Effect.runSync(closeModal);

		void Effect.runPromise(
			Effect.gen(function* () {
				yield* updateTransfer(transferId, { status: "in_progress" });

				const file = Bun.file(sendData.filePath);
				const exists = yield* Effect.tryPromise({
					try: () => file.exists(),
					catch: () => false,
				});
				if (!exists) {
					yield* failTransfer(transferId, "File not found.");
					return;
				}

				yield* updateTransfer(transferId, { fileSize: file.size });

				let fileToSend = sendData.filePath;
				if (sendData.encryptionMode === "public_key") {
					if (!peer.publicKey) {
						yield* failTransfer(transferId, "Peer public key is missing.");
						return;
					}
					yield* updateTransferProgress(transferId, 10);
					const encrypted = yield* zenc.encryptFile(fileToSend, {
						toPublicKey: peer.publicKey,
					});
					fileToSend = encrypted.encryptedPath;
					yield* updateTransferProgress(transferId, 40);
				}

				if (sendData.encryptionMode === "password") {
					if (!sendData.password) {
						yield* failTransfer(transferId, "Password is required.");
						return;
					}
					yield* updateTransferProgress(transferId, 10);
					const encrypted = yield* zenc.encryptFile(fileToSend, {
						password: sendData.password,
					});
					fileToSend = encrypted.encryptedPath;
					yield* updateTransferProgress(transferId, 40);
				}

				const updatedFile = Bun.file(fileToSend);
				const updatedExists = yield* Effect.tryPromise({
					try: () => updatedFile.exists(),
					catch: () => false,
				});
				if (updatedExists) {
					yield* updateTransfer(transferId, { fileSize: updatedFile.size });
				}

				yield* updateTransferProgress(transferId, 60);
				const result = yield* zend.sendFile(fileToSend, peer.id);
				yield* updateTransferProgress(transferId, 100);
				yield* completeTransfer(transferId, result.hash);
			}).pipe(
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						const message =
							error instanceof Error ? error.message : JSON.stringify(error);
						yield* failTransfer(transferId, message);
					}),
				),
			),
		);
	}, [peer, sendData, fileName]);

	const handleCancel = useCallback(() => {
		Effect.runSync(closeModal);
	}, []);

	useEffect(() => {
		setModalCommandHandlers({
			confirm: handleConfirm,
			cancel: handleCancel,
			nextField: () => {},
			prevField: () => {},
		});
		return () => setModalCommandHandlers(null);
	}, [handleConfirm, handleCancel]);

	if (!sendData || !peer) return null;

	return (
		<ModalFrame width={width} height={height} title="Confirm Send">
			<text fg={ui.foregroundDim}>Ready to send file</text>
			<box style={{ height: 1 }} />

			<text fg={ui.foregroundDim}>File: </text>
			<text fg={ui.foreground}>{fileName}</text>
			<box style={{ height: 1 }} />

			<text fg={ui.foregroundDim}>To: </text>
			<text fg={ui.foreground}>{peer.label ?? peer.address}</text>
			<box style={{ height: 1 }} />

			<text fg={ui.foregroundDim}>Encryption: </text>
			<text fg={ui.accent}>
				{sendData.encryptionMode === "public_key"
					? "Peer's public key"
					: "Password-based"}
			</text>

			<box style={{ flexGrow: 1 }} />

			<box style={{ flexDirection: "row" }}>
				<text fg={ui.success}>Enter</text>
				<text fg={ui.foreground}> Send </text>
				<text fg={ui.foregroundDim}>Esc</text>
				<text fg={ui.foreground}> Cancel</text>
			</box>
		</ModalFrame>
	);
}
