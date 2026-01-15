import { useTheme } from "@features/theme/themeState";

type Props = {
	width: number;
	height: number;
};

export function FilesView({ width, height }: Props) {
	const ui = useTheme().ui;

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
			<text fg={ui.foreground}>Files</text>
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
					<text fg={ui.foregroundDim}>Recent files will appear here.</text>
					<box style={{ height: 1 }} />
					<box style={{ flexDirection: "row" }}>
						<text fg={ui.foreground}>Press </text>
						<text fg={ui.accent}>s</text>
						<text fg={ui.foreground}> to send a file.</text>
					</box>
					<box style={{ height: 1 }} />
					<text fg={ui.foregroundDim}>
						You can also drag & drop files to send them.
					</text>
				</box>
			</box>

			<box style={{ height: 2 }} />
			<box style={{ flexDirection: "row" }}>
				<text fg={ui.accent}>o</text>
				<text fg={ui.foregroundDim}>{" Open file picker  "}</text>
				<text fg={ui.accent}>h</text>
				<text fg={ui.foregroundDim}>{" Show received files"}</text>
			</box>
		</box>
	);
}
