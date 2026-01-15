import { setModalCommandHandlers } from "@app/commands/context";
import {
	closeModal,
	openModal,
	useModalState,
} from "@features/overlays/modalState";
import { useTheme } from "@features/theme/themeState";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import type { IncomingRequest } from "@shared/types";
import { Effect } from "effect";
import { useCallback, useEffect } from "react";

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function ReceiveRequestModal() {
	const ui = useTheme().ui;
	const modalState = useModalState();
	const request = modalState.data as IncomingRequest | undefined;

	const { width, height } = useModalDimensions({
		minWidth: 50,
		widthPercent: 0.5,
		maxWidthPercent: 0.7,
		minHeight: 14,
		heightPercent: 0.35,
		maxHeightPercent: 0.5,
	});

	const handleConfirm = useCallback(() => {
		if (!request) return;
		Effect.runSync(openModal("save_location", request));
	}, [request]);

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

	if (!request) return null;

	return (
		<ModalFrame width={width} height={height} title="Incoming File">
			<text fg={ui.info}>A peer wants to send you a file</text>
			<box style={{ height: 1 }} />

			<text fg={ui.foregroundDim}>File: </text>
			<text fg={ui.foreground}>{request.fileName}</text>
			<box style={{ height: 1 }} />

			<text fg={ui.foregroundDim}>Size: </text>
			<text fg={ui.foreground}>{formatBytes(request.fileSize)}</text>
			<box style={{ height: 1 }} />

			<text fg={ui.foregroundDim}>From: </text>
			<text fg={ui.accentSecondary}>
				{request.peerFingerprint.slice(0, 16)}...
			</text>

			<box style={{ flexGrow: 1 }} />

			<box style={{ flexDirection: "row" }}>
				<text fg={ui.success}>Enter</text>
				<text fg={ui.foreground}> Accept </text>
				<text fg={ui.error}>Esc</text>
				<text fg={ui.foreground}> Decline</text>
			</box>
		</ModalFrame>
	);
}
