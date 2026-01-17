import { createSubscriptionRef, useSubscriptionValue } from "@shared/store";
import type { ThemeId, ThemePalette } from "@shared/themes";
import { DEFAULT_THEME_ID, resolveTheme } from "@shared/themes";
import { Effect, SubscriptionRef } from "effect";

const initialTheme = resolveTheme(DEFAULT_THEME_ID);

export const themeStateRef = createSubscriptionRef(initialTheme);

export function useTheme(): ThemePalette {
	return useSubscriptionValue(themeStateRef);
}

export const setThemeId = (themeId: ThemeId) =>
	Effect.gen(function* () {
		const next = resolveTheme(themeId);
		yield* SubscriptionRef.set(themeStateRef, next);
	});
