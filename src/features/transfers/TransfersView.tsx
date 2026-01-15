import { useIdentityState } from "@features/identity/identityState";
import { useTheme } from "@features/theme/themeState";
import { useTransfersState } from "@features/transfers/transfersState";

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

export function TransfersView({ width, height }: Props) {
	const ui = useTheme().ui;
	const { identity } = useIdentityState();
	const hasIdentity = Boolean(identity);
	const { transfers, selectedTransferId } = useTransfersState();

	if (transfers.length === 0) {
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
				<text fg={ui.foreground}>Transfers</text>
				<box style={{ height: 2 }} />
				<box
					style={{
						borderStyle: "single",
						borderColor: ui.border,
						padding: 2,
						width: Math.min(50, width - 4),
					}}
				>
					<box style={{ flexDirection: "column" }}>
						<text fg={ui.foregroundDim}>No transfers yet.</text>
						<box style={{ height: 1 }} />
						<box style={{ flexDirection: "row" }}>
							{hasIdentity ? (
								<>
									<text fg={ui.foreground}>Press </text>
									<text fg={ui.accent}>s</text>
									<text fg={ui.foreground}> to send a file to a peer.</text>
								</>
							) : (
								<>
									<text fg={ui.foreground}>Press </text>
									<text fg={ui.accent}>n</text>
									<text fg={ui.foreground}>
										{" "}
										to create identity before sending.
									</text>
								</>
							)}
						</box>
					</box>
				</box>
			</box>
		);
	}

	const active = transfers.filter(
		(t) => t.status === "pending" || t.status === "in_progress",
	);
	const completed = transfers.filter(
		(t) =>
			t.status === "completed" ||
			t.status === "failed" ||
			t.status === "cancelled",
	);

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
			<text fg={ui.foreground}>Transfers</text>
			<box style={{ height: 1 }} />

			{active.length > 0 && (
				<>
					<text fg={ui.foregroundDim}>Active ({active.length})</text>
					<box style={{ height: 1 }} />
					{active.map((transfer) => {
						const isSelected = transfer.id === selectedTransferId;
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
					<box style={{ height: 1 }} />
				</>
			)}

			{completed.length > 0 && (
				<>
					<text fg={ui.foregroundDim}>History ({completed.length})</text>
					<box style={{ height: 1 }} />
					{completed.slice(0, 5).map((transfer) => {
						const isSelected = transfer.id === selectedTransferId;
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
				<text fg={ui.accent}>x</text>
				<text fg={ui.foregroundDim}>{" Cancel  "}</text>
				<text fg={ui.accent}>v</text>
				<text fg={ui.foregroundDim}>{" Verify hash"}</text>
			</box>
		</box>
	);
}
