import { setModalCommandHandlers } from "@app/commands/context";
import { closeModal, openModal } from "@features/overlays/modalState";
import { useTheme } from "@features/theme/themeState";
import { useKeyboard } from "@opentui/react";
import { readFromClipboard } from "@shared/clipboard";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import { getPrintableKey, type InputKey } from "@shared/keyboard";
import { Effect } from "effect";
import { useCallback, useEffect, useState } from "react";

export function SelectFileModal() {
	const ui = useTheme().ui;
	const { width, height } = useModalDimensions({
		minWidth: 55,
		widthPercent: 0.6,
		maxWidthPercent: 0.8,
		minHeight: 12,
		heightPercent: 0.3,
		maxHeightPercent: 0.4,
	});

	const [filePath, setFilePath] = useState("");

	const handleConfirm = useCallback(() => {
		if (!filePath.trim()) return;
		// Open encryption options modal with file data
		Effect.runSync(
			openModal("encryption_options", { filePath: filePath.trim() }),
		);
	}, [filePath]);

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

			// Handle paste: Cmd+V (meta or super), Ctrl+V, Ctrl+Shift+V, or Ctrl+Y (yank)
			const hasCommandModifier = key.meta || key.ctrl || key.super;
			const isPasteShortcut =
				(hasCommandModifier && key.name === "v") ||
				(key.ctrl && key.name === "y");
			if (isPasteShortcut) {
				Effect.runPromise(readFromClipboard)
					.then((text) => {
						setFilePath((current) => current + text);
					})
					.catch(() => {});
				return;
			}

			if (key.ctrl || key.meta || key.alt || key.super) return;
			if (key.name === "tab" || key.name === "return" || key.name === "escape")
				return;
			if (key.name === "backspace") {
				setFilePath((value) => value.slice(0, -1));
				return;
			}
			const nextChar = getPrintableKey(key);
			if (nextChar) setFilePath((value) => value + nextChar);
		},
		[],
	);

	useKeyboard(handleInputKey);

	return (
		<ModalFrame width={width} height={height} title="Select File to Send">
			<text fg={ui.foregroundDim}>
				Enter the path to the file you want to send
			</text>
			<box style={{ height: 1 }} />

			<text fg={ui.accent}>File path:</text>
			<box
				style={{
					borderStyle: "single",
					borderColor: ui.accent,
					padding: 0,
					paddingLeft: 1,
					height: 3,
				}}
			>
				<text fg={ui.foreground}>{filePath || " "}</text>
			</box>

			<box style={{ flexGrow: 1 }} />

			<box style={{ flexDirection: "row" }}>
				<text fg={ui.foregroundDim}>Enter</text>
				<text fg={ui.foreground}> Continue </text>
				<text fg={ui.foregroundDim}>Esc</text>
				<text fg={ui.foreground}> Cancel</text>
			</box>
		</ModalFrame>
	);
}
