import { useIdentityState } from "@features/identity/identityState";
import { usePeersState } from "@features/peers/peersState";
import { useTheme } from "@features/theme/themeState";

type Props = {
	width: number;
	height: number;
};

export function PeersView({ width, height }: Props) {
	const ui = useTheme().ui;
	const { identity } = useIdentityState();
	const hasIdentity = Boolean(identity);
	const { peers, selectedPeerId, isLoading, error } = usePeersState();

	if (isLoading) {
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
				<text fg={ui.foreground}>Peers</text>
				<box style={{ height: 1 }} />
				<text fg={ui.info}>Loading...</text>
			</box>
		);
	}

	if (error) {
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
				<text fg={ui.foreground}>Peers</text>
				<box style={{ height: 1 }} />
				<text fg={ui.error}>Error: {error}</text>
			</box>
		);
	}

	if (peers.length === 0) {
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
				<text fg={ui.foreground}>Peers</text>
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
						<text fg={ui.foregroundDim}>No peers added yet.</text>
						<box style={{ height: 1 }} />
						<box style={{ flexDirection: "row" }}>
							{hasIdentity ? (
								<>
									<text fg={ui.foreground}>Press </text>
									<text fg={ui.accent}>a</text>
									<text fg={ui.foreground}> to add a peer.</text>
								</>
							) : (
								<>
									<text fg={ui.foreground}>Press </text>
									<text fg={ui.accent}>n</text>
									<text fg={ui.foreground}> to create identity first.</text>
								</>
							)}
						</box>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>
							You'll need their address (IP or hostname) to connect.
						</text>
					</box>
				</box>
			</box>
		);
	}

	const tableWidth = Math.min(70, width - 4);
	const labelWidth = 20;
	const addressWidth = 25;
	const trustWidth = 12;

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
			<text fg={ui.foreground}>Peers ({peers.length})</text>
			<box style={{ height: 1 }} />

			{/* Table Header */}
			<box style={{ flexDirection: "row", width: tableWidth }}>
				<text fg={ui.foregroundDim} style={{ width: 3 }}>
					{"   "}
				</text>
				<text fg={ui.foregroundDim} style={{ width: labelWidth }}>
					Label
				</text>
				<text fg={ui.foregroundDim} style={{ width: addressWidth }}>
					Address
				</text>
				<text fg={ui.foregroundDim} style={{ width: trustWidth }}>
					Trust
				</text>
			</box>
			<text fg={ui.border}>{"─".repeat(tableWidth)}</text>

			{/* Table Rows */}
			{peers.map((peer) => {
				const isSelected = peer.id === selectedPeerId;
				const trustColor =
					peer.trustLevel === "trusted"
						? ui.success
						: peer.trustLevel === "blocked"
							? ui.error
							: ui.warning;

				return (
					<box
						key={peer.id}
						style={{
							flexDirection: "row",
							width: tableWidth,
							backgroundColor: isSelected ? ui.selection : undefined,
						}}
					>
						<text
							fg={isSelected ? ui.accent : ui.foreground}
							style={{ width: 3 }}
						>
							{isSelected ? " ▸ " : "   "}
						</text>
						<text fg={ui.foreground} style={{ width: labelWidth }}>
							{(peer.label ?? "Unnamed").slice(0, labelWidth - 1)}
						</text>
						<text fg={ui.foregroundDim} style={{ width: addressWidth }}>
							{peer.address.slice(0, addressWidth - 1)}
						</text>
						<text fg={trustColor} style={{ width: trustWidth }}>
							{peer.trustLevel}
						</text>
					</box>
				);
			})}

			<box style={{ height: 2 }} />
			<box style={{ flexDirection: "row" }}>
				<text fg={ui.accent}>a</text>
				<text fg={ui.foregroundDim}>{" Add  "}</text>
				<text fg={ui.accent}>d</text>
				<text fg={ui.foregroundDim}>{" Delete  "}</text>
				<text fg={ui.accent}>t</text>
				<text fg={ui.foregroundDim}>{" Trust  "}</text>
				<text fg={ui.accent}>s</text>
				<text fg={ui.foregroundDim}>{" Send file"}</text>
			</box>
		</box>
	);
}
