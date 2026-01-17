import { setModalCommandHandlers } from "@app/commands/context";
import {
	closeModal,
	openModal,
	useModalState,
} from "@features/overlays/modalState";
import { useTheme } from "@features/theme/themeState";
import { useKeyboard } from "@opentui/react";
import { readFromClipboard } from "@shared/clipboard";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import { getPrintableKey, type InputKey } from "@shared/keyboard";
import { Effect } from "effect";
import { useCallback, useEffect, useState } from "react";

type EncryptionMode = "public_key" | "password";

export function EncryptionOptionsModal() {
	const ui = useTheme().ui;
	const modalState = useModalState();
	const fileData = modalState.data as { filePath: string } | undefined;

	const { width, height } = useModalDimensions({
		minWidth: 50,
		widthPercent: 0.5,
		maxWidthPercent: 0.7,
		minHeight: 14,
		heightPercent: 0.35,
		maxHeightPercent: 0.5,
	});

	const [mode, setMode] = useState<EncryptionMode>("public_key");
	const [password, setPassword] = useState("");

	const handleConfirm = useCallback(() => {
		Effect.runSync(
			openModal("confirm_send", {
				...fileData,
				encryptionMode: mode,
				password: mode === "password" ? password : undefined,
			}),
		);
	}, [fileData, mode, password]);

	const handleCancel = useCallback(() => {
		Effect.runSync(closeModal);
	}, []);

	const handleNextField = useCallback(() => {
		setMode((m) => (m === "public_key" ? "password" : "public_key"));
	}, []);

	useEffect(() => {
		setModalCommandHandlers({
			confirm: handleConfirm,
			cancel: handleCancel,
			nextField: handleNextField,
			prevField: handleNextField,
		});
		return () => setModalCommandHandlers(null);
	}, [handleConfirm, handleCancel, handleNextField]);

	const handleInputKey = useCallback(
		(key: InputKey & { ctrl?: boolean; meta?: boolean; alt?: boolean; super?: boolean }) => {
			if (!key.name) return;

			// Handle paste: Cmd+V (meta or super), Ctrl+V, Ctrl+Shift+V, or Ctrl+Y (yank)
			const hasCommandModifier = key.meta || key.ctrl || key.super;
			const isPasteShortcut =
				(hasCommandModifier && key.name === "v") ||
				(key.ctrl && key.name === "y");
			if (isPasteShortcut) {
				if (mode === "password") {
					Effect.runPromise(readFromClipboard)
						.then((text) => setPassword((current) => current + text))
						.catch(() => {});
				}
				return;
			}

			if (key.ctrl || key.meta || key.alt || key.super) return;
			if (key.name === "tab" || key.name === "return" || key.name === "escape")
				return;
			if (mode !== "password") return;
			if (key.name === "backspace") {
				setPassword((value) => value.slice(0, -1));
				return;
			}
			const nextChar = getPrintableKey(key);
			if (nextChar) setPassword((value) => value + nextChar);
		},
		[mode],
	);

	useKeyboard(handleInputKey);

	return (
		<ModalFrame width={width} height={height} title="Encryption Options">
			<text fg={ui.foregroundDim}>Choose how to encrypt the file</text>
			<box style={{ height: 1 }} />

			{/* Public key option */}
			<box style={{ flexDirection: "row" }}>
				<text fg={mode === "public_key" ? ui.accent : ui.foregroundDim}>
					{mode === "public_key" ? "◉ " : "○ "}
				</text>
				<text fg={mode === "public_key" ? ui.foreground : ui.foregroundDim}>
					Use peer's public key (recommended)
				</text>
			</box>

			<box style={{ height: 1 }} />

			{/* Password option */}
			<box style={{ flexDirection: "row" }}>
				<text fg={mode === "password" ? ui.accent : ui.foregroundDim}>
					{mode === "password" ? "◉ " : "○ "}
				</text>
				<text fg={mode === "password" ? ui.foreground : ui.foregroundDim}>
					Use shared password
				</text>
			</box>

			{mode === "password" && (
				<>
					<box style={{ height: 1 }} />
					<text fg={ui.foregroundDim}>Password:</text>
					<box
						style={{
							borderStyle: "single",
							borderColor: ui.accent,
							padding: 0,
							paddingLeft: 1,
							height: 3,
						}}
					>
						<text fg={ui.foreground}>{"•".repeat(password.length) || " "}</text>
					</box>
				</>
			)}

			<box style={{ flexGrow: 1 }} />

			<box style={{ flexDirection: "row" }}>
				<text fg={ui.foregroundDim}>Tab</text>
				<text fg={ui.foreground}> Toggle </text>
				<text fg={ui.foregroundDim}>Enter</text>
				<text fg={ui.foreground}> Continue </text>
				<text fg={ui.foregroundDim}>Esc</text>
				<text fg={ui.foreground}> Cancel</text>
			</box>
		</ModalFrame>
	);
}
