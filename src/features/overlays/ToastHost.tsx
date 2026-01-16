import { useToastState } from "@features/overlays/toastState";
import { useTheme } from "@features/theme/themeState";
import { useTerminalSize } from "@shared/hooks/useTerminalSize";

function clampMessage(message: string, maxLength: number): string {
	if (message.length <= maxLength) return message;
	if (maxLength <= 3) return message.slice(0, maxLength);
	return `${message.slice(0, maxLength - 3)}...`;
}

export function ToastHost() {
	const toast = useToastState();
	const ui = useTheme().ui;
	const terminalSize = useTerminalSize();

	if (!toast) return null;

	const maxWidth = Math.min(60, Math.max(1, terminalSize.width - 4));
	const messageMax = Math.max(1, maxWidth - 6);
	const message = clampMessage(toast.message, messageMax);
	const boxWidth = Math.min(maxWidth, message.length + 6);

	const toneColor =
		toast.tone === "success"
			? ui.success
			: toast.tone === "error"
				? ui.error
				: toast.tone === "warning"
					? ui.warning
					: ui.info;

	return (
		<box
			style={{
				position: "absolute",
				bottom: 1,
				right: 2,
				width: boxWidth,
				border: true,
				borderStyle: "single",
				borderColor: toneColor,
				backgroundColor: ui.backgroundAlt,
				paddingLeft: 1,
				paddingRight: 1,
				paddingTop: 1,
				paddingBottom: 1,
				zIndex: 12,
				flexDirection: "row",
			}}
		>
			<text fg={toneColor}>*</text>
			<text fg={ui.foreground}> {message}</text>
		</box>
	);
}
