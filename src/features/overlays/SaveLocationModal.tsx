import { join } from "node:path";
import { setModalCommandHandlers } from "@app/commands/context";
import { closeModal, useModalState } from "@features/overlays/modalState";
import {
	getReceiveState,
	removeIncomingRequest,
} from "@features/receive/receiveState";
import { useTheme } from "@features/theme/themeState";
import { addTransfer } from "@features/transfers/transfersState";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import type { IncomingRequest, Transfer } from "@shared/types";
import { Effect } from "effect";
import { useCallback, useEffect, useState } from "react";

export function SaveLocationModal() {
	const ui = useTheme().ui;
	const modalState = useModalState();
	const request = modalState.data as IncomingRequest | undefined;
	const { defaultSavePath } = getReceiveState();

	const { width, height } = useModalDimensions({
		minWidth: 50,
		widthPercent: 0.5,
		maxWidthPercent: 0.7,
		minHeight: 12,
		heightPercent: 0.3,
		maxHeightPercent: 0.4,
	});

	const [savePath, _setSavePath] = useState(defaultSavePath);

	const handleConfirm = useCallback(() => {
		if (!request) return;

		const transfer: Transfer = {
			id: `transfer-${Date.now()}`,
			direction: "receive",
			peerId: request.peerId,
			fileName: request.fileName,
			fileSize: request.fileSize,
			filePath: join(savePath, request.fileName),
			progress: 0,
			status: "pending",
			startedAt: new Date(),
		};

		Effect.runSync(addTransfer(transfer));
		Effect.runSync(removeIncomingRequest(request.id));
		Effect.runSync(closeModal);
	}, [request, savePath]);

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
		<ModalFrame width={width} height={height} title="Save Location">
			<text fg={ui.foregroundDim}>
				Choose where to save: {request.fileName}
			</text>
			<box style={{ height: 1 }} />

			<text fg={ui.accent}>Save to:</text>
			<box
				style={{
					borderStyle: "single",
					borderColor: ui.accent,
					padding: 0,
					paddingLeft: 1,
					height: 3,
				}}
			>
				<text fg={ui.foreground}>{savePath || " "}</text>
			</box>

			<box style={{ flexGrow: 1 }} />

			<box style={{ flexDirection: "row" }}>
				<text fg={ui.foregroundDim}>Enter</text>
				<text fg={ui.foreground}> Save </text>
				<text fg={ui.foregroundDim}>Esc</text>
				<text fg={ui.foreground}> Cancel</text>
			</box>
		</ModalFrame>
	);
}
