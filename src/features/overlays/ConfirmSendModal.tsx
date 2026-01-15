import { setModalCommandHandlers } from "@app/commands/context";
import { closeModal, useModalState } from "@features/overlays/modalState";
import { getSelectedPeer } from "@features/peers/peersState";
import { useTheme } from "@features/theme/themeState";
import { addTransfer } from "@features/transfers/transfersState";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
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

		const transfer: Transfer = {
			id: `transfer-${Date.now()}`,
			direction: "send",
			peerId: peer.id,
			fileName,
			fileSize: 0, // Will be populated by IPC
			progress: 0,
			status: "pending",
			startedAt: new Date(),
		};

		Effect.runSync(addTransfer(transfer));
		Effect.runSync(closeModal);
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
