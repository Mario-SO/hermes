import { useFocusState } from "@features/focus/focusState";
import { useIdentityState } from "@features/identity/identityState";
import { useNavigationState } from "@features/navigation/navigationState";
import { getSelectedPeer } from "@features/peers/peersState";
import {
	getSelectedRequest,
	useReceiveState,
} from "@features/receive/receiveState";
import { useTheme } from "@features/theme/themeState";
import { getSelectedTransfer } from "@features/transfers/transfersState";

type Props = {
	width: number;
	height: number;
};

function formatFingerprint(fp: string): string {
	// Format as groups of 4 chars
	return fp.match(/.{1,4}/g)?.join(" ") ?? fp;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function InspectPane({ width, height }: Props) {
	const ui = useTheme().ui;
	const { activeSection } = useNavigationState();
	const { focusedPane } = useFocusState();
	const isFocused = focusedPane === "inspect";
	const identityState = useIdentityState();
	const receiveState = useReceiveState();

	const renderContent = () => {
		switch (activeSection) {
			case "identity": {
				const { identity } = identityState;
				if (!identity) {
					return <text fg={ui.foregroundDim}>No identity</text>;
				}
				return (
					<>
						<text fg={ui.foregroundDim}>Fingerprint:</text>
						<text fg={ui.accent}>
							{formatFingerprint(identity.fingerprint)}
						</text>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>Created:</text>
						<text fg={ui.foreground}>
							{identity.createdAt.toLocaleDateString()}
						</text>
					</>
				);
			}

			case "peers": {
				const peer = getSelectedPeer();
				if (!peer) {
					return <text fg={ui.foregroundDim}>No peer selected</text>;
				}
				return (
					<>
						<text fg={ui.foreground}>{peer.label ?? "Unnamed Peer"}</text>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>Address:</text>
						<text fg={ui.foreground}>{peer.address}</text>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>Fingerprint:</text>
						<text fg={ui.accent}>{formatFingerprint(peer.fingerprint)}</text>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>Trust:</text>
						<text
							fg={
								peer.trustLevel === "trusted"
									? ui.success
									: peer.trustLevel === "blocked"
										? ui.error
										: ui.warning
							}
						>
							{peer.trustLevel}
						</text>
					</>
				);
			}

			case "transfers": {
				const transfer = getSelectedTransfer();
				if (!transfer) {
					return <text fg={ui.foregroundDim}>No transfer selected</text>;
				}
				return (
					<>
						<text fg={ui.foreground}>{transfer.fileName}</text>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>Direction:</text>
						<text fg={ui.foreground}>{transfer.direction}</text>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>Size:</text>
						<text fg={ui.foreground}>{formatBytes(transfer.fileSize)}</text>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>Status:</text>
						<text
							fg={
								transfer.status === "completed"
									? ui.success
									: transfer.status === "failed"
										? ui.error
										: ui.info
							}
						>
							{transfer.status}
						</text>
						{transfer.hash && (
							<>
								<box style={{ height: 1 }} />
								<text fg={ui.foregroundDim}>Hash:</text>
								<text fg={ui.accentSecondary}>
									{transfer.hash.slice(0, 16)}...
								</text>
							</>
						)}
					</>
				);
			}

			case "receive": {
				if (receiveState.status === "idle") {
					return (
						<>
							<text fg={ui.foregroundDim}>Not listening</text>
							<box style={{ height: 1 }} />
							<text fg={ui.foregroundDim}>Press </text>
							<text fg={ui.accent}>r</text>
							<text fg={ui.foregroundDim}> to start</text>
						</>
					);
				}
				const request = getSelectedRequest();
				if (!request) {
					return (
						<>
							<text fg={ui.success}>● Listening</text>
							<box style={{ height: 1 }} />
							<text fg={ui.foregroundDim}>Waiting for</text>
							<text fg={ui.foregroundDim}>incoming files...</text>
						</>
					);
				}
				return (
					<>
						<text fg={ui.foreground}>{request.fileName}</text>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>From:</text>
						<text fg={ui.accent}>
							{request.peerFingerprint.slice(0, 16)}...
						</text>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>Size:</text>
						<text fg={ui.foreground}>{formatBytes(request.fileSize)}</text>
					</>
				);
			}

			default:
				return <text fg={ui.foregroundDim}>No selection</text>;
		}
	};

	return (
		<box
			style={{
				width,
				height,
				border: true,
				borderStyle: "single",
				borderColor: isFocused ? ui.accent : ui.border,
				flexDirection: "column",
				paddingTop: 1,
				paddingLeft: 1,
				paddingRight: 1,
			}}
		>
			<text fg={isFocused ? ui.accent : ui.foregroundDim}>INSPECT</text>
			<box style={{ height: 1 }} />
			{renderContent()}
		</box>
	);
}
