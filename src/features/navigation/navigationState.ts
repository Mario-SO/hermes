import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";
import type { SectionId } from "@shared/types";
import { Effect, SubscriptionRef } from "effect";

export type NavigationState = {
	activeSection: SectionId;
};

const initialState: NavigationState = {
	activeSection: "identity",
};

export const navigationStateRef = createSubscriptionRef(initialState);

export function useNavigationState(): NavigationState {
	return useSubscriptionValue(navigationStateRef);
}

export function getNavigationState(): NavigationState {
	return getSubscriptionValue(navigationStateRef);
}

export const navigateTo = (section: SectionId) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(navigationStateRef, (state) => ({
			...state,
			activeSection: section,
		}));
	});

const SECTION_ORDER: SectionId[] = [
	"identity",
	"peers",
	"transfers",
	"receive",
	"files",
];

export const navigateNext = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(navigationStateRef);
	const currentIndex = SECTION_ORDER.indexOf(state.activeSection);
	const nextIndex = (currentIndex + 1) % SECTION_ORDER.length;
	const nextSection = SECTION_ORDER[nextIndex] ?? "identity";
	yield* SubscriptionRef.set(navigationStateRef, {
		...state,
		activeSection: nextSection,
	});
});

export const navigatePrev = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(navigationStateRef);
	const currentIndex = SECTION_ORDER.indexOf(state.activeSection);
	const prevIndex =
		(currentIndex - 1 + SECTION_ORDER.length) % SECTION_ORDER.length;
	const prevSection = SECTION_ORDER[prevIndex] ?? "identity";
	yield* SubscriptionRef.set(navigationStateRef, {
		...state,
		activeSection: prevSection,
	});
});
