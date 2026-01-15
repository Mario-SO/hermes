import { setModalCommandHandlers } from "@app/commands/context";
import { closeModal } from "@features/overlays/modalState";
import { addPeer } from "@features/peers/peersState";
import { useTheme } from "@features/theme/themeState";
import { useKeyboard } from "@opentui/react";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import type { Peer } from "@shared/types";
import { Effect } from "effect";
import { useCallback, useEffect, useState } from "react";

export function AddPeerModal() {
	const ui = useTheme().ui;
	const { width, height } = useModalDimensions({
		minWidth: 50,
		widthPercent: 0.5,
		maxWidthPercent: 0.7,
		minHeight: 14,
		heightPercent: 0.4,
		maxHeightPercent: 0.5,
	});

	const [address, setAddress] = useState("");
	const [label, setLabel] = useState("");
	const [focusedField, setFocusedField] = useState<"address" | "label">(
		"address",
	);

	const handleConfirm = useCallback(() => {
		if (!address.trim()) return;

		const newPeer: Peer = {
			id: `peer-${Date.now()}`,
			address: address.trim(),
			publicKey: "", // Will be populated after connection
			fingerprint: "", // Will be populated after connection
			label: label.trim() || undefined,
			trustLevel: "pending",
		};

		Effect.runSync(addPeer(newPeer));
		Effect.runSync(closeModal);
	}, [address, label]);

	const handleCancel = useCallback(() => {
		Effect.runSync(closeModal);
	}, []);

	const handleNextField = useCallback(() => {
		setFocusedField((f) => (f === "address" ? "label" : "address"));
	}, []);

	const handlePrevField = useCallback(() => {
		setFocusedField((f) => (f === "label" ? "address" : "label"));
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
		(key: { name?: string; ctrl?: boolean; meta?: boolean; alt?: boolean }) => {
			if (!key.name) return;
			if (key.ctrl || key.meta || key.alt) return;
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
				const nextChar = keyName === "space" ? " " : keyName;
				if (nextChar.length === 1) {
					setter(current + nextChar);
				}
			};

			if (focusedField === "address") {
				updateField(address, setAddress);
			} else {
				updateField(label, setLabel);
			}
		},
		[address, label, focusedField],
	);

	useKeyboard(handleInputKey);

	return (
		<ModalFrame width={width} height={height} title="Add Peer">
			<text fg={ui.foregroundDim}>
				Enter the peer's address (IP or hostname)
			</text>
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

			{/* Label field */}
			<text fg={focusedField === "label" ? ui.accent : ui.foregroundDim}>
				Label (optional):
			</text>
			<box
				style={{
					borderStyle: "single",
					borderColor: focusedField === "label" ? ui.accent : ui.border,
					padding: 0,
					paddingLeft: 1,
					height: 3,
				}}
			>
				<text fg={ui.foreground}>{label || " "}</text>
			</box>

			<box style={{ flexGrow: 1 }} />

			{/* Footer hints */}
			<box style={{ flexDirection: "row" }}>
				<text fg={ui.foregroundDim}>Tab</text>
				<text fg={ui.foreground}> Switch field </text>
				<text fg={ui.foregroundDim}>Enter</text>
				<text fg={ui.foreground}> Add </text>
				<text fg={ui.foregroundDim}>Esc</text>
				<text fg={ui.foreground}> Cancel</text>
			</box>
		</ModalFrame>
	);
}
