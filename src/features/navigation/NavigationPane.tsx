import { useFocusState } from "@features/focus/focusState";
import { useNavigationState } from "@features/navigation/navigationState";
import { useTheme } from "@features/theme/themeState";
import type { SectionId } from "@shared/types";

type SectionItem = {
	id: SectionId;
	label: string;
	icon: string;
};

const SECTIONS: SectionItem[] = [
	{ id: "identity", label: "Identity", icon: "◈" },
	{ id: "peers", label: "Peers", icon: "◎" },
	{ id: "transfers", label: "Transfers", icon: "↑" },
	{ id: "receive", label: "Receive", icon: "↓" },
	{ id: "files", label: "Files", icon: "▤" },
];

type Props = {
	width: number;
	height: number;
};

export function NavigationPane({ width, height }: Props) {
	const ui = useTheme().ui;
	const { activeSection } = useNavigationState();
	const { focusedPane } = useFocusState();
	const isFocused = focusedPane === "navigation";

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
			}}
		>
			<text fg={isFocused ? ui.accent : ui.foregroundDim}>{" SECTIONS"}</text>
			<box style={{ height: 1 }} />
			{SECTIONS.map((section) => {
				const isActive = section.id === activeSection;
				return (
					<text key={section.id} fg={isActive ? ui.accent : ui.foreground}>
						{isActive ? " ▸ " : "   "}
						{section.icon} {section.label}
					</text>
				);
			})}
			<box style={{ flexGrow: 1 }} />
			<text fg={ui.foregroundDim}> ─────────────────</text>
			<text fg={ui.foregroundDim}>
				{isFocused ? " j/k navigate" : " Tab to focus"}
			</text>
		</box>
	);
}
