import { useIdentityState } from "@features/identity/identityState";
import { useTheme } from "@features/theme/themeState";

type Props = {
	width: number;
	height: number;
};

function formatFingerprint(fp: string): string {
	return fp.match(/.{1,4}/g)?.join(" ") ?? fp;
}

export function IdentityView({ width, height }: Props) {
	const ui = useTheme().ui;
	const { identity, isLoading, error } = useIdentityState();

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
				<text fg={ui.foreground}>Identity</text>
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
				<text fg={ui.foreground}>Identity</text>
				<box style={{ height: 1 }} />
				<text fg={ui.error}>Error: {error}</text>
			</box>
		);
	}

	if (!identity) {
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
				<text fg={ui.foreground}>Identity</text>
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
						<text fg={ui.foregroundDim}>No identity found.</text>
						<box style={{ height: 1 }} />
						<box style={{ flexDirection: "row" }}>
							<text fg={ui.foreground}>Press </text>
							<text fg={ui.accent}>n</text>
							<text fg={ui.foreground}> to create a new identity.</text>
						</box>
						<box style={{ height: 1 }} />
						<text fg={ui.foregroundDim}>
							Your identity is your cryptographic keypair that uniquely
						</text>
						<text fg={ui.foregroundDim}>
							identifies you to peers. It never leaves your device.
						</text>
					</box>
				</box>
			</box>
		);
	}

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
			<text fg={ui.foreground}>Identity</text>
			<box style={{ height: 2 }} />

			<box
				style={{
					borderStyle: "single",
					borderColor: ui.accentSecondary,
					padding: 2,
					width: Math.min(60, width - 4),
				}}
			>
				<box style={{ flexDirection: "column" }}>
					<text fg={ui.success}>● Identity Active</text>
					<box style={{ height: 1 }} />

					<text fg={ui.foregroundDim}>Your Fingerprint:</text>
					<box style={{ height: 1 }} />
					<text fg={ui.accent}>{formatFingerprint(identity.fingerprint)}</text>
					<box style={{ height: 1 }} />

					<text fg={ui.foregroundDim}>
						Created: {identity.createdAt.toLocaleDateString()}
					</text>
					<box style={{ height: 2 }} />

					<text fg={ui.foregroundDim}>
						Share your fingerprint with peers to receive files.
					</text>
				</box>
			</box>

			<box style={{ height: 2 }} />
			<box style={{ flexDirection: "row" }}>
				<text fg={ui.foregroundDim}>Press </text>
				<text fg={ui.accent}>c</text>
				<text fg={ui.foregroundDim}> to copy fingerprint</text>
			</box>
			<box style={{ flexDirection: "row" }}>
				<text fg={ui.foregroundDim}>Press </text>
				<text fg={ui.accent}>e</text>
				<text fg={ui.foregroundDim}> to export identity</text>
			</box>
		</box>
	);
}
