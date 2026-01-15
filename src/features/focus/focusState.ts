import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";
import type { FocusedPane } from "@shared/types";
import { Effect, SubscriptionRef } from "effect";

export type FocusState = {
	focusedPane: FocusedPane;
};

const initialState: FocusState = {
	focusedPane: "navigation",
};

export const focusStateRef = createSubscriptionRef(initialState);

export function useFocusState(): FocusState {
	return useSubscriptionValue(focusStateRef);
}

export function getFocusedPane(): FocusedPane {
	return getSubscriptionValue(focusStateRef).focusedPane;
}

const PANE_ORDER: FocusedPane[] = ["navigation", "main", "inspect"];

export const focusNextPane = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(focusStateRef);
	const currentIndex = PANE_ORDER.indexOf(state.focusedPane);
	const nextIndex = (currentIndex + 1) % PANE_ORDER.length;
	const nextPane = PANE_ORDER[nextIndex] ?? "navigation";
	yield* SubscriptionRef.set(focusStateRef, {
		...state,
		focusedPane: nextPane,
	});
});

export const focusPrevPane = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(focusStateRef);
	const currentIndex = PANE_ORDER.indexOf(state.focusedPane);
	const prevIndex = (currentIndex - 1 + PANE_ORDER.length) % PANE_ORDER.length;
	const prevPane = PANE_ORDER[prevIndex] ?? "navigation";
	yield* SubscriptionRef.set(focusStateRef, {
		...state,
		focusedPane: prevPane,
	});
});

export const focusPane = (pane: FocusedPane) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(focusStateRef, (state) => ({
			...state,
			focusedPane: pane,
		}));
	});
