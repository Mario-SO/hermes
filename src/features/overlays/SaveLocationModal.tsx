import { setModalCommandHandlers } from "@app/commands/context";
import { closeModal, useModalState } from "@features/overlays/modalState";
import { showToast } from "@features/overlays/toastState";
import {
	getReceiveState,
	setDefaultSavePath,
	startListening,
} from "@features/receive/receiveState";
import { useTheme } from "@features/theme/themeState";
import { useKeyboard } from "@opentui/react";
import { readFromClipboard } from "@shared/clipboard";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import { getPrintableKey, type InputKey } from "@shared/keyboard";
import type { IncomingRequest } from "@shared/types";
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

	const [savePath, setSavePath] = useState(defaultSavePath);

	const handleConfirm = useCallback(() => {
		const nextPath = savePath.trim();
		if (!nextPath) return;

		void Effect.runPromise(
			Effect.gen(function* () {
				yield* setDefaultSavePath(nextPath);

				const { status } = getReceiveState();
				if (status === "listening") {
					yield* startListening;
					yield* showToast({
						tone: "success",
						message: "Receive path updated and listener restarted.",
					});
				} else if (status === "receiving") {
					yield* showToast({
						tone: "warning",
						message: "Path updated. Restart listener after current receive.",
					});
				} else {
					yield* showToast({
						tone: "success",
						message: "Default receive path updated.",
					});
				}

				yield* closeModal;
			}),
		);
	}, [savePath]);

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

	const handleInputKey = useCallback(
		(
			key: InputKey & {
				ctrl?: boolean;
				meta?: boolean;
				alt?: boolean;
				super?: boolean;
			},
		) => {
			if (!key.name) return;

			const hasCommandModifier = key.meta || key.ctrl || key.super;
			const isPasteShortcut =
				(hasCommandModifier && key.name === "v") ||
				(key.ctrl && key.name === "y");
			if (isPasteShortcut) {
				Effect.runPromise(readFromClipboard)
					.then((text) => setSavePath((current) => current + text))
					.catch(() => {});
				return;
			}

			if (key.ctrl || key.meta || key.alt || key.super) return;
			if (key.name === "tab" || key.name === "return" || key.name === "escape")
				return;
			if (key.name === "backspace") {
				setSavePath((value) => value.slice(0, -1));
				return;
			}
			const nextChar = getPrintableKey(key);
			if (nextChar) setSavePath((value) => value + nextChar);
		},
		[],
	);

	useKeyboard(handleInputKey);

	return (
		<ModalFrame width={width} height={height} title="Receive Save Path">
			<text fg={ui.foregroundDim}>
				{request
					? `Choose where to save: ${request.fileName}`
					: "Choose the default folder for received files"}
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
