export type ThemeUi = {
	background: string;
	backgroundAlt: string;
	backgroundDark: string;
	selection: string;
	foreground: string;
	foregroundDim: string;
	border: string;
	borderHighlight: string;
	cursor: string;
	error: string;
	warning: string;
	success: string;
	info: string;
	accent: string;
	accentSecondary: string;
	accentTertiary: string;
};

export type ThemePalette = {
	ui: ThemeUi;
};

export type ThemeId = "hermes-dark" | "hermes-light";

export const DEFAULT_THEME_ID: ThemeId = "hermes-dark";

const HERMES_DARK: ThemePalette = {
	ui: {
		background: "#0D0D0D",
		backgroundAlt: "#161616",
		backgroundDark: "#1A1A1A",
		selection: "#252525",
		foreground: "#E8E8E8",
		foregroundDim: "#666666",
		border: "#2A2A2A",
		borderHighlight: "#3D3D3D",
		cursor: "#00D9FF",
		error: "#FF5C5C",
		warning: "#FFB347",
		success: "#5CFF8A",
		info: "#5CB8FF",
		accent: "#00D9FF",
		accentSecondary: "#A78BFA",
		accentTertiary: "#34D399",
	},
};

const HERMES_LIGHT: ThemePalette = {
	ui: {
		background: "#FAFAFA",
		backgroundAlt: "#F0F0F0",
		backgroundDark: "#E5E5E5",
		selection: "#D4D4D4",
		foreground: "#1A1A1A",
		foregroundDim: "#737373",
		border: "#D4D4D4",
		borderHighlight: "#A3A3A3",
		cursor: "#0891B2",
		error: "#DC2626",
		warning: "#D97706",
		success: "#059669",
		info: "#0284C7",
		accent: "#0891B2",
		accentSecondary: "#7C3AED",
		accentTertiary: "#10B981",
	},
};

export const BUILTIN_THEMES: Record<ThemeId, ThemePalette> = {
	"hermes-dark": HERMES_DARK,
	"hermes-light": HERMES_LIGHT,
};

export function resolveTheme(themeId: ThemeId): ThemePalette {
	return BUILTIN_THEMES[themeId] ?? HERMES_DARK;
}
