import { Buffer } from "node:buffer";
import { join } from "node:path";
import { setModalCommandHandlers } from "@app/commands/context";
import { closeModal, useModalState } from "@features/overlays/modalState";
import { showToast } from "@features/overlays/toastState";
import { useTheme } from "@features/theme/themeState";
import { useKeyboard } from "@opentui/react";
import { readFromClipboard } from "@shared/clipboard";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import { zenc } from "@shared/ipc";
import { getPrintableKey, type InputKey } from "@shared/keyboard";
import { Effect } from "effect";
import { useCallback, useEffect, useState } from "react";

type DecryptMode = "device_key" | "password";

type DecryptModalData = {
	filePath: string;
	fileName: string;
};

const loadZendSecretKey = Effect.tryPromise({
	try: async () => {
		const home = process.env.HOME;
		if (!home) {
			throw new Error("HOME is not set.");
		}

		const identityPath = join(home, ".zend", "identity");
		const file = Bun.file(identityPath);
		const exists = await file.exists();
		if (!exists) {
			throw new Error("Zend identity file not found.");
		}

		const buffer = await file.arrayBuffer();
		if (buffer.byteLength !== 64) {
			throw new Error("Invalid zend identity file.");
		}

		return Buffer.from(new Uint8Array(buffer)).toString("base64");
	},
	catch: (error) => (error instanceof Error ? error : new Error(String(error))),
});

const formatDecryptError = (error: unknown): string =>
	error instanceof Error ? error.message : JSON.stringify(error);

export function DecryptFileModal() {
	const ui = useTheme().ui;
	const modalState = useModalState();
	const fileData = modalState.data as DecryptModalData | undefined;

	const { width, height } = useModalDimensions({
		minWidth: 55,
		widthPercent: 0.6,
		maxWidthPercent: 0.8,
		minHeight: 16,
		heightPercent: 0.4,
		maxHeightPercent: 0.5,
	});

	const [mode, setMode] = useState<DecryptMode>("device_key");
	const [password, setPassword] = useState("");

	const handleConfirm = useCallback(() => {
		// #region agent log
		fetch('http://127.0.0.1:7244/ingest/a5a80ac1-dc74-4c8c-af6c-9f67359bf38f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DecryptFileModal.tsx:handleConfirm',message:'Confirm handler called',data:{hasFileData:!!fileData},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
		// #endregion
		if (!fileData) return;

		void Effect.runPromise(
			Effect.gen(function* () {
				const file = Bun.file(fileData.filePath);
				const exists = yield* Effect.tryPromise({
					try: () => file.exists(),
					catch: () => false,
				});
				if (!exists) {
					yield* showToast({
						tone: "error",
						message: "File not found on disk.",
					});
					return;
				}

				let decryptOptions: { secretKey?: string; password?: string };
				if (mode === "device_key") {
					const secretKey = yield* loadZendSecretKey;
					decryptOptions = { secretKey };
				} else {
					if (!password) {
						yield* showToast({
							tone: "warning",
							message: "Password is required to decrypt.",
						});
						return;
					}
					decryptOptions = { password };
				}

				yield* closeModal;

				const result = yield* zenc.decryptFile(
					fileData.filePath,
					decryptOptions,
				);
				yield* showToast({
					tone: "success",
					message: `Decrypted to ${result.decryptedPath}`,
				});
			}).pipe(
				Effect.catchAll((error) =>
					showToast({
						tone: "error",
						message: formatDecryptError(error),
					}),
				),
			),
		);
	}, [fileData, mode, password]);

	const handleCancel = useCallback(() => {
		// #region agent log
		fetch('http://127.0.0.1:7244/ingest/a5a80ac1-dc74-4c8c-af6c-9f67359bf38f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DecryptFileModal.tsx:handleCancel',message:'Cancel handler called',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
		// #endregion
		Effect.runSync(closeModal);
	}, []);

	const handleToggleMode = useCallback(() => {
		// #region agent log
		fetch('http://127.0.0.1:7244/ingest/a5a80ac1-dc74-4c8c-af6c-9f67359bf38f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DecryptFileModal.tsx:handleToggleMode',message:'Toggle mode handler called',data:{currentMode:mode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
		// #endregion
		setMode((current) =>
			current === "device_key" ? "password" : "device_key",
		);
	}, []);

	useEffect(() => {
		// #region agent log
		fetch('http://127.0.0.1:7244/ingest/a5a80ac1-dc74-4c8c-af6c-9f67359bf38f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DecryptFileModal.tsx:useEffect',message:'Setting modal command handlers',data:{hasConfirm:!!handleConfirm,hasCancel:!!handleCancel,hasToggle:!!handleToggleMode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
		// #endregion
		setModalCommandHandlers({
			confirm: handleConfirm,
			cancel: handleCancel,
			nextField: handleToggleMode,
			prevField: handleToggleMode,
		});
		return () => setModalCommandHandlers(null);
	}, [handleConfirm, handleCancel, handleToggleMode]);

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

	if (!fileData) return null;

	return (
		<ModalFrame width={width} height={height} title="Decrypt File">
			<text fg={ui.foregroundDim}>Choose how to decrypt:</text>
			<box style={{ height: 1 }} />

			<text fg={ui.foregroundDim}>File:</text>
			<text fg={ui.foreground}>{fileData.fileName}</text>
			<box style={{ height: 1 }} />

			<box style={{ flexDirection: "row" }}>
				<text fg={mode === "device_key" ? ui.accent : ui.foregroundDim}>
					{mode === "device_key" ? "◉ " : "○ "}
				</text>
				<text fg={mode === "device_key" ? ui.foreground : ui.foregroundDim}>
					Use this machine's key
				</text>
			</box>

			<box style={{ height: 1 }} />

			<box style={{ flexDirection: "row" }}>
				<text fg={mode === "password" ? ui.accent : ui.foregroundDim}>
					{mode === "password" ? "◉ " : "○ "}
				</text>
				<text fg={mode === "password" ? ui.foreground : ui.foregroundDim}>
					Use password
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
				<text fg={ui.foreground}> Decrypt </text>
				<text fg={ui.foregroundDim}>Esc</text>
				<text fg={ui.foreground}> Cancel</text>
			</box>
		</ModalFrame>
	);
}
