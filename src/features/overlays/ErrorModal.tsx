import { setModalCommandHandlers } from "@app/commands/context";
import { closeModal, useModalState } from "@features/overlays/modalState";
import { useTheme } from "@features/theme/themeState";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import { Effect } from "effect";
import { useCallback, useEffect } from "react";

export function ErrorModal() {
	const ui = useTheme().ui;
	const modalState = useModalState();
	const errorData = modalState.data as { message: string } | undefined;

	const { width, height } = useModalDimensions({
		minWidth: 40,
		widthPercent: 0.4,
		maxWidthPercent: 0.6,
		minHeight: 10,
		heightPercent: 0.25,
		maxHeightPercent: 0.4,
	});

	const handleClose = useCallback(() => {
		Effect.runSync(closeModal);
	}, []);

	useEffect(() => {
		setModalCommandHandlers({
			confirm: handleClose,
			cancel: handleClose,
			nextField: () => {},
			prevField: () => {},
		});
		return () => setModalCommandHandlers(null);
	}, [handleClose]);

	return (
		<ModalFrame width={width} height={height} title="Error">
			<text fg={ui.error}>✗ An error occurred</text>
			<box style={{ height: 1 }} />
			<text fg={ui.foreground}>{errorData?.message ?? "Unknown error"}</text>

			<box style={{ flexGrow: 1 }} />

			<box style={{ flexDirection: "row" }}>
				<text fg={ui.foregroundDim}>Enter/Esc</text>
				<text fg={ui.foreground}> Close</text>
			</box>
		</ModalFrame>
	);
}
