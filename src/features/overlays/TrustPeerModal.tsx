import { setModalCommandHandlers } from "@app/commands/context";
import { closeModal, useModalState } from "@features/overlays/modalState";
import { updatePeer } from "@features/peers/peersState";
import { useTheme } from "@features/theme/themeState";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import type { Peer } from "@shared/types";
import { Effect } from "effect";
import { useCallback, useEffect } from "react";

function formatFingerprint(fp: string): string {
	return fp.match(/.{1,4}/g)?.join(" ") ?? fp;
}

export function TrustPeerModal() {
	const ui = useTheme().ui;
	const modalState = useModalState();
	const peer = modalState.data as Peer | undefined;

	const { width, height } = useModalDimensions({
		minWidth: 50,
		widthPercent: 0.5,
		maxWidthPercent: 0.7,
		minHeight: 16,
		heightPercent: 0.4,
		maxHeightPercent: 0.5,
	});

	const handleConfirm = useCallback(() => {
		if (!peer) return;
		Effect.runSync(updatePeer(peer.id, { trustLevel: "trusted" }));
		Effect.runSync(closeModal);
	}, [peer]);

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

	if (!peer) return null;

	return (
		<ModalFrame width={width} height={height} title="Trust Peer?">
			<text fg={ui.warning}>⚠ First-time connection</text>
			<box style={{ height: 1 }} />

			<text fg={ui.foregroundDim}>
				You are about to trust this peer. Verify their fingerprint
			</text>
			<text fg={ui.foregroundDim}>
				matches what they shared with you out-of-band.
			</text>
			<box style={{ height: 1 }} />

			<text fg={ui.foregroundDim}>Peer: </text>
			<text fg={ui.foreground}>{peer.label ?? peer.address}</text>
			<box style={{ height: 1 }} />

			<text fg={ui.foregroundDim}>Fingerprint:</text>
			<text fg={ui.accent}>
				{formatFingerprint(peer.fingerprint || "Unknown")}
			</text>

			<box style={{ flexGrow: 1 }} />

			{/* Footer hints */}
			<box style={{ flexDirection: "row" }}>
				<text fg={ui.success}>Enter</text>
				<text fg={ui.foreground}> Trust </text>
				<text fg={ui.foregroundDim}>Esc</text>
				<text fg={ui.foreground}> Cancel</text>
			</box>
		</ModalFrame>
	);
}
