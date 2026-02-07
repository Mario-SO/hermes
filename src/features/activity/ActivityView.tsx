import {
	buildActivitySections,
	syncActivitySelection,
	useActivityState,
} from "@features/activity/activityState";
import { useIdentityState } from "@features/identity/identityState";
import { useReceiveState } from "@features/receive/receiveState";
import { useTheme } from "@features/theme/themeState";
import { useTransfersState } from "@features/transfers/transfersState";
import { Effect } from "effect";
import { useEffect, useMemo } from "react";

type Props = {
	width: number;
	height: number;
};

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function renderProgressBar(
	progress: number,
	width: number,
	_ui: { accent: string; border: string },
): string {
	const filled = Math.floor((progress / 100) * width);
	const empty = width - filled;
	return "█".repeat(filled) + "░".repeat(empty);
}

export function ActivityView({ width, height }: Props) {
	const ui = useTheme().ui;
	const { identity } = useIdentityState();
	const hasIdentity = Boolean(identity);
	const receiveState = useReceiveState();
	const transfersState = useTransfersState();
	const activityState = useActivityState();

	const { requests, activeTransfers, historyTransfers, items } = useMemo(
		() =>
			buildActivitySections(
				receiveState.incomingRequests,
				transfersState.transfers,
			),
		[receiveState.incomingRequests, transfersState.transfers],
	);

	useEffect(() => {
		void Effect.runPromise(syncActivitySelection(items));
	}, [items]);

	const hasActivity = items.length > 0;

	return (
		<box
			style={{
				width,
				height,
				flexDirection: "column",
				paddingLeft: 2,
				paddingTop: 1,
			}}
		>
			<text fg={ui.foreground}>Activity</text>
			<box style={{ height: 1 }} />

			<box style={{ flexDirection: "row", marginBottom: 1 }}>
				<text fg={ui.foregroundDim}>Status: </text>
				{receiveState.status === "listening" ? (
					<text fg={ui.success}>● Listening</text>
				) : receiveState.status === "receiving" ? (
					<text fg={ui.info}>● Receiving</text>
				) : (
					<text fg={ui.foregroundDim}>○ Idle</text>
				)}
				<box style={{ flexGrow: 1 }} />
				<text fg={ui.foregroundDim}>{`Requests ${requests.length} `}</text>
				<text fg={ui.foregroundDim}>{`Active ${activeTransfers.length} `}</text>
				<text
					fg={ui.foregroundDim}
				>{`History ${historyTransfers.length}`}</text>
			</box>

			<text fg={ui.foregroundDim}>
				{`Save to: ${receiveState.defaultSavePath}`}
			</text>

			{!hasActivity && (
				<>
					<box style={{ height: 2 }} />
					<box
						style={{
							borderStyle: "single",
							borderColor: ui.border,
							padding: 2,
							width: Math.min(60, width - 4),
						}}
					>
						<box style={{ flexDirection: "column" }}>
							<text fg={ui.foregroundDim}>No activity yet.</text>
							<box style={{ height: 1 }} />
							{hasIdentity ? (
								<>
									<box style={{ flexDirection: "row" }}>
										<text fg={ui.foreground}>Press </text>
										<text fg={ui.accent}>s</text>
										<text fg={ui.foreground}> to send a file.</text>
									</box>
									<box style={{ flexDirection: "row" }}>
										<text fg={ui.foreground}>Press </text>
										<text fg={ui.accent}>r</text>
										<text fg={ui.foreground}> to start listening.</text>
									</box>
								</>
							) : (
								<box style={{ flexDirection: "row" }}>
									<text fg={ui.foreground}>Press </text>
									<text fg={ui.accent}>n</text>
									<text fg={ui.foreground}> to create identity.</text>
								</box>
							)}
						</box>
					</box>
				</>
			)}

			{requests.length > 0 && (
				<>
					<box style={{ height: 2 }} />
					<text fg={ui.foregroundDim}>
						{`Incoming Requests (${requests.length})`}
					</text>
					<box style={{ height: 1 }} />
					{requests.map((request) => {
						const isSelected =
							activityState.selected?.kind === "request" &&
							activityState.selected.id === request.id;

						return (
							<box
								key={request.id}
								style={{
									flexDirection: "column",
									backgroundColor: isSelected ? ui.selection : undefined,
									padding: 1,
									marginBottom: 1,
									borderStyle: "single",
									borderColor: isSelected ? ui.accent : ui.border,
									width: Math.min(60, width - 4),
								}}
							>
								<box style={{ flexDirection: "row" }}>
									<text fg={isSelected ? ui.accent : ui.foreground}>
										{isSelected ? "▸ " : "  "}
									</text>
									<text fg={ui.info}>↓ </text>
									<text fg={ui.foreground}>{request.fileName}</text>
								</box>
								<box style={{ flexDirection: "row", paddingLeft: 4 }}>
									<text fg={ui.foregroundDim}>
										{formatBytes(request.fileSize)} from{" "}
									</text>
									<text fg={ui.accentSecondary}>
										{request.peerFingerprint.slice(0, 12)}...
									</text>
								</box>
							</box>
						);
					})}
				</>
			)}

			{activeTransfers.length > 0 && (
				<>
					<box style={{ height: 1 }} />
					<text fg={ui.foregroundDim}>
						{`Active Transfers (${activeTransfers.length})`}
					</text>
					<box style={{ height: 1 }} />
					{activeTransfers.map((transfer) => {
						const isSelected =
							activityState.selected?.kind === "transfer" &&
							activityState.selected.id === transfer.id;
						const dirIcon = transfer.direction === "send" ? "↑" : "↓";
						const barWidth = Math.min(20, width - 40);

						return (
							<box
								key={transfer.id}
								style={{
									flexDirection: "column",
									marginBottom: 1,
									backgroundColor: isSelected ? ui.selection : undefined,
									padding: 1,
									width: Math.min(60, width - 4),
								}}
							>
								<box style={{ flexDirection: "row" }}>
									<text fg={isSelected ? ui.accent : ui.foreground}>
										{isSelected ? "▸ " : "  "}
									</text>
									<text fg={ui.info}>{dirIcon} </text>
									<text fg={ui.foreground}>
										{transfer.fileName.slice(0, 30)}
									</text>
									<text fg={ui.foregroundDim}>
										{" "}
										({formatBytes(transfer.fileSize)})
									</text>
								</box>
								<box style={{ flexDirection: "row", paddingLeft: 4 }}>
									<text fg={ui.accent}>
										{renderProgressBar(transfer.progress, barWidth, ui)}
									</text>
									<text fg={ui.foreground}>
										{" "}
										{transfer.progress.toFixed(0)}%
									</text>
								</box>
							</box>
						);
					})}
				</>
			)}

			{historyTransfers.length > 0 && (
				<>
					<box style={{ height: 1 }} />
					<text fg={ui.foregroundDim}>
						{`History (${historyTransfers.length})`}
					</text>
					<box style={{ height: 1 }} />
					{historyTransfers.slice(0, 8).map((transfer) => {
						const isSelected =
							activityState.selected?.kind === "transfer" &&
							activityState.selected.id === transfer.id;
						const dirIcon = transfer.direction === "send" ? "↑" : "↓";
						const statusColor =
							transfer.status === "completed"
								? ui.success
								: transfer.status === "failed"
									? ui.error
									: ui.foregroundDim;
						const statusIcon =
							transfer.status === "completed"
								? "✓"
								: transfer.status === "failed"
									? "✗"
									: "○";

						return (
							<box
								key={transfer.id}
								style={{
									flexDirection: "row",
									backgroundColor: isSelected ? ui.selection : undefined,
								}}
							>
								<text fg={isSelected ? ui.accent : ui.foreground}>
									{isSelected ? "▸ " : "  "}
								</text>
								<text fg={statusColor}>{statusIcon} </text>
								<text fg={ui.foregroundDim}>{dirIcon} </text>
								<text fg={ui.foreground}>{transfer.fileName.slice(0, 25)}</text>
								<text fg={ui.foregroundDim}>
									{" "}
									{formatBytes(transfer.fileSize)}
								</text>
							</box>
						);
					})}
				</>
			)}

			<box style={{ height: 2 }} />
			<box style={{ flexDirection: "row" }}>
				<text fg={ui.accent}>j/k</text>
				<text fg={ui.foregroundDim}>{" Select  "}</text>
				{activityState.selected?.kind === "request" && (
					<>
						<text fg={ui.accent}>Enter</text>
						<text fg={ui.foregroundDim}>{" Accept  "}</text>
						<text fg={ui.accent}>d</text>
						<text fg={ui.foregroundDim}>{" Decline  "}</text>
					</>
				)}
				{activityState.selected?.kind === "transfer" && (
					<>
						<text fg={ui.accent}>x</text>
						<text fg={ui.foregroundDim}>{" Cancel  "}</text>
						<text fg={ui.accent}>d</text>
						<text fg={ui.foregroundDim}>{" Decrypt  "}</text>
						<text fg={ui.accent}>v</text>
						<text fg={ui.foregroundDim}>{" Verify  "}</text>
					</>
				)}
				{receiveState.status !== "idle" && (
					<>
						<text fg={ui.accent}>Esc</text>
						<text fg={ui.foregroundDim}>{" Stop  "}</text>
					</>
				)}
				{hasIdentity && (
					<>
						<text fg={ui.accent}>r</text>
						<text fg={ui.foregroundDim}>{" Listen"}</text>
					</>
				)}
				<text fg={ui.accent}>{"  o"}</text>
				<text fg={ui.foregroundDim}>{" Save path"}</text>
			</box>
		</box>
	);
}
