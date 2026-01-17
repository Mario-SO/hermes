import { setModalCommandHandlers } from "@app/commands/context";
import {
	closeModal,
	openErrorModal,
	openTrustPeerModal,
} from "@features/overlays/modalState";
import { useTheme } from "@features/theme/themeState";
import { useKeyboard } from "@opentui/react";
import { readFromClipboard } from "@shared/clipboard";
import { ModalFrame } from "@shared/components/ModalFrame";
import { parseEd25519PublicKey } from "@shared/crypto";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import { getPrintableKey, type InputKey } from "@shared/keyboard";
import type { Peer } from "@shared/types";
import { Effect } from "effect";
import { useCallback, useEffect, useState } from "react";

export function AddPeerModal() {
	const ui = useTheme().ui;
	const { width, height } = useModalDimensions({
		minWidth: 50,
		widthPercent: 0.5,
		maxWidthPercent: 0.7,
		minHeight: 18,
		heightPercent: 0.5,
		maxHeightPercent: 0.5,
	});

	const [address, setAddress] = useState("");
	const [name, setName] = useState("");
	const [publicKey, setPublicKey] = useState("");
	const [focusedField, setFocusedField] = useState<
		"name" | "address" | "publicKey"
	>("name");

	const handleConfirm = useCallback(() => {
		const trimmedName = name.trim();
		const trimmedAddress = address.trim();
		const parsedKey = parseEd25519PublicKey(publicKey);

		if (!trimmedName || !trimmedAddress || !publicKey.trim()) return;
		if (!parsedKey) {
			Effect.runSync(
				openErrorModal("Public key must be a base64-encoded Ed25519 key."),
			);
			return;
		}

		const newPeer: Peer = {
			id: trimmedName,
			address: trimmedAddress,
			publicKey: parsedKey.normalized,
			fingerprint: parsedKey.fingerprint,
			label: trimmedName,
			trustLevel: "pending",
		};

		Effect.runSync(openTrustPeerModal(newPeer));
	}, [address, name, publicKey]);

	const handleCancel = useCallback(() => {
		Effect.runSync(closeModal);
	}, []);

	const handleNextField = useCallback(() => {
		setFocusedField((field) => {
			switch (field) {
				case "name":
					return "address";
				case "address":
					return "publicKey";
				default:
					return "name";
			}
		});
	}, []);

	const handlePrevField = useCallback(() => {
		setFocusedField((field) => {
			switch (field) {
				case "publicKey":
					return "address";
				case "address":
					return "name";
				default:
					return "publicKey";
			}
		});
	}, []);

	useEffect(() => {
		setModalCommandHandlers({
			confirm: handleConfirm,
			cancel: handleCancel,
			nextField: handleNextField,
			prevField: handlePrevField,
		});
		return () => setModalCommandHandlers(null);
	}, [handleConfirm, handleCancel, handleNextField, handlePrevField]);

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
						if (focusedField === "name") {
							setName((current) => current + text);
						} else if (focusedField === "address") {
							setAddress((current) => current + text);
						} else {
							setPublicKey((current) => current + text);
						}
					})
					.catch(() => {});
				return;
			}

			if (key.ctrl || key.meta || key.alt || key.super) return;
			if (key.name === "tab" || key.name === "return" || key.name === "escape")
				return;

			const keyName = key.name;
			const updateField = (
				current: string,
				setter: (value: string) => void,
			) => {
				if (keyName === "backspace") {
					setter(current.slice(0, -1));
					return;
				}
				const nextChar = getPrintableKey(key);
				if (nextChar) setter(current + nextChar);
			};

			if (focusedField === "name") {
				updateField(name, setName);
				return;
			}
			if (focusedField === "address") {
				updateField(address, setAddress);
				return;
			}
			updateField(publicKey, setPublicKey);
		},
		[address, name, publicKey, focusedField],
	);

	useKeyboard(handleInputKey);

	return (
		<ModalFrame width={width} height={height} title="Add Peer">
			<text fg={ui.foregroundDim}>Enter peer details</text>
			<box style={{ height: 1 }} />

			{/* Name field */}
			<text fg={focusedField === "name" ? ui.accent : ui.foregroundDim}>
				Name:
			</text>
			<box
				style={{
					borderStyle: "single",
					borderColor: focusedField === "name" ? ui.accent : ui.border,
					padding: 0,
					paddingLeft: 1,
					height: 3,
				}}
			>
				<text fg={ui.foreground}>{name || " "}</text>
			</box>

			<box style={{ height: 1 }} />

			{/* Address field */}
			<text fg={focusedField === "address" ? ui.accent : ui.foregroundDim}>
				Address:
			</text>
			<box
				style={{
					borderStyle: "single",
					borderColor: focusedField === "address" ? ui.accent : ui.border,
					padding: 0,
					paddingLeft: 1,
					height: 3,
				}}
			>
				<text fg={ui.foreground}>{address || " "}</text>
			</box>

			<box style={{ height: 1 }} />

			{/* Public key field */}
			<text fg={focusedField === "publicKey" ? ui.accent : ui.foregroundDim}>
				Public key:
			</text>
			<box
				style={{
					borderStyle: "single",
					borderColor: focusedField === "publicKey" ? ui.accent : ui.border,
					padding: 0,
					paddingLeft: 1,
					height: 3,
				}}
			>
				<text fg={ui.foreground}>{publicKey || " "}</text>
			</box>

			<box style={{ flexGrow: 1 }} />

			{/* Footer hints */}
			<box style={{ flexDirection: "row" }}>
				<text fg={ui.foregroundDim}>Tab</text>
				<text fg={ui.foreground}> Switch field </text>
				<text fg={ui.foregroundDim}>Enter</text>
				<text fg={ui.foreground}> Continue </text>
				<text fg={ui.foregroundDim}>Esc</text>
				<text fg={ui.foreground}> Cancel</text>
			</box>
		</ModalFrame>
	);
}
