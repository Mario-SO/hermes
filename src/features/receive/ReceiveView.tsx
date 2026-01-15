import { useIdentityState } from "@features/identity/identityState";
import { useReceiveState } from "@features/receive/receiveState";
import { useTheme } from "@features/theme/themeState";

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

export function ReceiveView({ width, height }: Props) {
	const ui = useTheme().ui;
	const { identity } = useIdentityState();
	const hasIdentity = Boolean(identity);
	const {
		status,
		incomingRequests,
		selectedRequestId,
		defaultSavePath,
		error,
	} = useReceiveState();

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
			<text fg={ui.foreground}>Receive</text>
			<box style={{ height: 1 }} />

			{/* Status indicator */}
			<box
				style={{
					flexDirection: "row",
					marginBottom: 1,
				}}
			>
				<text fg={ui.foregroundDim}>Status: </text>
				{status === "listening" ? (
					<text fg={ui.success}>● Listening</text>
				) : status === "receiving" ? (
					<text fg={ui.info}>● Receiving</text>
				) : (
					<text fg={ui.foregroundDim}>○ Idle</text>
				)}
			</box>

			{error && <text fg={ui.error}>Error: {error}</text>}

			<box style={{ height: 1 }} />

			{status === "idle" ? (
				<box
					style={{
						borderStyle: "single",
						borderColor: ui.border,
						padding: 2,
						width: Math.min(50, width - 4),
					}}
				>
					<box style={{ flexDirection: "column" }}>
						<text fg={ui.foregroundDim}>
							Not currently listening for files.
						</text>
						<box style={{ height: 1 }} />
						<box style={{ flexDirection: "row" }}>
							{hasIdentity ? (
								<>
									<text fg={ui.foreground}>Press </text>
									<text fg={ui.accent}>r</text>
									<text fg={ui.foreground}> to start listening.</text>
								</>
							) : (
								<>
									<text fg={ui.foreground}>Press </text>
									<text fg={ui.accent}>n</text>
									<text fg={ui.foreground}>
										{" "}
										to create identity before listening.
									</text>
								</>
							)}
						</box>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>
							Files will be saved to: {defaultSavePath}
						</text>
					</box>
				</box>
			) : incomingRequests.length === 0 ? (
				<box
					style={{
						borderStyle: "single",
						borderColor: ui.accentTertiary,
						padding: 2,
						width: Math.min(50, width - 4),
					}}
				>
					<box style={{ flexDirection: "column" }}>
						<text fg={ui.success}>● Waiting for incoming files...</text>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>
							Your address is visible to trusted peers.
						</text>
						<box style={{ height: 1 }} />
						<box style={{ flexDirection: "row" }}>
							<text fg={ui.foreground}>Press </text>
							<text fg={ui.accent}>Esc</text>
							<text fg={ui.foreground}> to stop listening.</text>
						</box>
					</box>
				</box>
			) : (
				<>
					<text fg={ui.foregroundDim}>
						Incoming Requests ({incomingRequests.length})
					</text>
					<box style={{ height: 1 }} />
					{incomingRequests.map((request) => {
						const isSelected = request.id === selectedRequestId;

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
									width: Math.min(55, width - 4),
								}}
							>
								<box style={{ flexDirection: "row" }}>
									<text fg={isSelected ? ui.accent : ui.foreground}>
										{isSelected ? "▸ " : "  "}
									</text>
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

			<box style={{ height: 2 }} />
			{status === "idle" ? (
				<box style={{ flexDirection: "row" }}>
					{hasIdentity ? (
						<>
							<text fg={ui.accent}>r</text>
							<text fg={ui.foregroundDim}>{" Start listening  "}</text>
							<text fg={ui.accent}>p</text>
							<text fg={ui.foregroundDim}>{" Change save path"}</text>
						</>
					) : (
						<>
							<text fg={ui.accent}>n</text>
							<text fg={ui.foregroundDim}>{" Create identity"}</text>
						</>
					)}
				</box>
			) : (
				<box style={{ flexDirection: "row" }}>
					<text fg={ui.accent}>Enter</text>
					<text fg={ui.foregroundDim}>{" Accept  "}</text>
					<text fg={ui.accent}>d</text>
					<text fg={ui.foregroundDim}>{" Decline  "}</text>
					<text fg={ui.accent}>Esc</text>
					<text fg={ui.foregroundDim}>{" Stop"}</text>
				</box>
			)}
		</box>
	);
}
