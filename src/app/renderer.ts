import { createCliRenderer } from "@opentui/core";
import type { createRoot } from "@opentui/react";
import { DEFAULT_THEME_ID, resolveTheme } from "@shared/themes";

const initialTheme = resolveTheme(DEFAULT_THEME_ID);

export const renderer = await createCliRenderer({
	exitOnCtrlC: true,
	backgroundColor: initialTheme.ui.background,
});

export let root: ReturnType<typeof createRoot> | null = null;

export function setRoot(r: ReturnType<typeof createRoot>) {
	root = r;
}
