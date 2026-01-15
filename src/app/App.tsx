import { useCommandHandler } from "@app/keyboard";
import { FilesView } from "@features/files/FilesView";
import { useFocusState } from "@features/focus/focusState";
import { IdentityView } from "@features/identity/IdentityView";
import {
	loadIdentityFromZend,
	useIdentityState,
} from "@features/identity/identityState";
import { InspectPane } from "@features/inspect/InspectPane";
import { NavigationPane } from "@features/navigation/NavigationPane";
import { useNavigationState } from "@features/navigation/navigationState";
import { ModalHost } from "@features/overlays/ModalHost";
import { PeersView } from "@features/peers/PeersView";
import { ReceiveView } from "@features/receive/ReceiveView";
import { useReceiveState } from "@features/receive/receiveState";
import { useTheme } from "@features/theme/themeState";
import { TransfersView } from "@features/transfers/TransfersView";
import { useTransfersState } from "@features/transfers/transfersState";
import { useTerminalSize } from "@shared/hooks/useTerminalSize";
import { Effect } from "effect";
import { useEffect } from "react";

export function App() {
	// Wire up keyboard shortcuts
	useCommandHandler();
	const terminalSize = useTerminalSize();
	const ui = useTheme().ui;
	const { activeSection } = useNavigationState();
	const { focusedPane } = useFocusState();
	const { identity } = useIdentityState();
	const hasIdentity = Boolean(identity);
	const receiveState = useReceiveState();
	const transfersState = useTransfersState();
	const isMainFocused = focusedPane === "main";

	useEffect(() => {
		void Effect.runPromise(loadIdentityFromZend);
	}, []);

	const navWidth = 22;
	const inspectWidth = Math.min(
		32,
		Math.max(24, Math.floor(terminalSize.width * 0.24)),
	);
	const mainWidth = terminalSize.width - navWidth - inspectWidth;
	const contentHeight = terminalSize.height - 2; // Reserve header + footer

	// Count active items for status
	const activeTransfers = transfersState.transfers.filter(
		(t) => t.status === "in_progress",
	).length;
	const pendingRequests = receiveState.incomingRequests.length;

	const renderMainView = () => {
		switch (activeSection) {
			case "identity":
				return <IdentityView width={mainWidth} height={contentHeight} />;
			case "peers":
				return <PeersView width={mainWidth} height={contentHeight} />;
			case "transfers":
				return <TransfersView width={mainWidth} height={contentHeight} />;
			case "receive":
				return <ReceiveView width={mainWidth} height={contentHeight} />;
			case "files":
				return <FilesView width={mainWidth} height={contentHeight} />;
			default:
				return null;
		}
	};

	return (
		<box
			style={{
				flexGrow: 1,
				backgroundColor: ui.background,
				flexDirection: "column",
			}}
		>
			{/* Header */}
			<box
				style={{
					width: terminalSize.width,
					height: 1,
					flexDirection: "row",
					backgroundColor: ui.backgroundAlt,
				}}
			>
				<text fg={ui.accent}>{" ⚡ HERMES "}</text>
				<text fg={ui.foregroundDim}>{"│ P2P File Sharing"}</text>
				<box style={{ flexGrow: 1 }} />
				{/* Status indicators */}
				{receiveState.status === "listening" && (
					<text fg={ui.success}>{" ● LISTENING "}</text>
				)}
				{activeTransfers > 0 && (
					<text fg={ui.info}>{` ↑${activeTransfers} `}</text>
				)}
				{pendingRequests > 0 && (
					<text fg={ui.warning}>{` ↓${pendingRequests} `}</text>
				)}
			</box>

			{/* Main content area */}
			<box
				style={{
					flexDirection: "row",
					height: contentHeight,
				}}
			>
				{/* Left Navigation */}
				<NavigationPane width={navWidth} height={contentHeight} />

				{/* Main Panel */}
				<box
					style={{
						width: mainWidth,
						height: contentHeight,
						flexDirection: "column",
						border: true,
						borderStyle: "single",
						borderColor: isMainFocused ? ui.accent : ui.border,
					}}
				>
					{renderMainView()}
				</box>

				{/* Right Inspector */}
				<InspectPane width={inspectWidth} height={contentHeight} />
			</box>

			{/* Footer */}
			<box
				style={{
					width: terminalSize.width,
					height: 1,
					flexDirection: "row",
					backgroundColor: ui.backgroundAlt,
					paddingLeft: 1,
				}}
			>
				<text fg={ui.foregroundDim}>q</text>
				<text fg={ui.foreground}>{" Quit  "}</text>
				<text fg={ui.foregroundDim}>?</text>
				<text fg={ui.foreground}>{" Help  "}</text>
				{hasIdentity ? (
					<>
						<text fg={ui.foregroundDim}>a</text>
						<text fg={ui.foreground}>{" Add Peer  "}</text>
						<text fg={ui.foregroundDim}>s</text>
						<text fg={ui.foreground}>{" Send  "}</text>
						<text fg={ui.foregroundDim}>r</text>
						<text fg={ui.foreground}>{" Receive  "}</text>
					</>
				) : (
					<>
						<text fg={ui.foregroundDim}>n</text>
						<text fg={ui.foreground}>{" Create Identity  "}</text>
					</>
				)}
				<box style={{ flexGrow: 1 }} />
				<text fg={ui.foregroundDim}>Tab</text>
				<text fg={ui.foreground}>{" Pane  "}</text>
				<text fg={ui.foregroundDim}>j/k</text>
				<text fg={ui.foreground}>
					{focusedPane === "navigation" ? " Section " : " Select "}
				</text>
			</box>

			{/* Modal overlay */}
			<ModalHost />
		</box>
	);
}
