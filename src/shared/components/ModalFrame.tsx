import { useTheme } from "@features/theme/themeState";
import type { PropsWithChildren } from "react";

interface ModalFrameProps extends PropsWithChildren {
	width: number;
	height: number;
	title?: string;
	zIndex?: number;
}

export function ModalFrame({
	width,
	height,
	title,
	zIndex = 10,
	children,
}: ModalFrameProps) {
	const ui = useTheme().ui;
	return (
		<box
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				width,
				height,
				marginTop: -Math.floor(height / 2),
				marginLeft: -Math.floor(width / 2),
				backgroundColor: ui.background,
				border: true,
				borderStyle: "double",
				borderColor: ui.borderHighlight,
				zIndex,
				flexDirection: "column",
				padding: 1,
			}}
		>
			{title && (
				<>
					<text fg={ui.accent}>{title}</text>
					<box style={{ height: 1 }} />
				</>
			)}
			{children}
		</box>
	);
}
