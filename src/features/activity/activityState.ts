import { getReceiveState } from "@features/receive/receiveState";
import { getTransfersState } from "@features/transfers/transfersState";
import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";
import type { IncomingRequest, Transfer } from "@shared/types";
import { Effect, SubscriptionRef } from "effect";

export type ActivityItemKind = "request" | "transfer";

export type ActivityItem = {
	kind: ActivityItemKind;
	id: string;
};

export type ActivitySelection = ActivityItem;

type ActivityState = {
	selected: ActivitySelection | null;
};

const initialState: ActivityState = {
	selected: null,
};

export const activityStateRef = createSubscriptionRef(initialState);

export function useActivityState(): ActivityState {
	return useSubscriptionValue(activityStateRef);
}

export function getActivityState(): ActivityState {
	return getSubscriptionValue(activityStateRef);
}

export const setSelectedActivity = (selection: ActivitySelection | null) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.set(activityStateRef, {
			selected: selection,
		});
	});

export type ActivitySections = {
	requests: IncomingRequest[];
	activeTransfers: Transfer[];
	historyTransfers: Transfer[];
	items: ActivityItem[];
};

export const buildActivitySections = (
	incomingRequests: IncomingRequest[],
	transfers: Transfer[],
): ActivitySections => {
	const activeTransfers = transfers.filter(
		(transfer) =>
			transfer.status === "pending" || transfer.status === "in_progress",
	);
	const historyTransfers = transfers.filter(
		(transfer) =>
			transfer.status === "completed" ||
			transfer.status === "failed" ||
			transfer.status === "cancelled",
	);

	const items: ActivityItem[] = [
		...incomingRequests.map((request) => ({
			kind: "request" as const,
			id: request.id,
		})),
		...activeTransfers.map((transfer) => ({
			kind: "transfer" as const,
			id: transfer.id,
		})),
		...historyTransfers.map((transfer) => ({
			kind: "transfer" as const,
			id: transfer.id,
		})),
	];

	return {
		requests: incomingRequests,
		activeTransfers,
		historyTransfers,
		items,
	};
};

export const getActivitySections = (): ActivitySections => {
	const receiveState = getReceiveState();
	const transfersState = getTransfersState();
	return buildActivitySections(
		receiveState.incomingRequests,
		transfersState.transfers,
	);
};

export const getSelectedActivity = (): ActivitySelection | null =>
	getActivityState().selected;

export const getActivityItemData = (
	selection: ActivitySelection | null,
):
	| { kind: "request"; request: IncomingRequest }
	| { kind: "transfer"; transfer: Transfer }
	| null => {
	if (!selection) return null;
	if (selection.kind === "request") {
		const request = getReceiveState().incomingRequests.find(
			(item) => item.id === selection.id,
		);
		return request ? { kind: "request", request } : null;
	}

	const transfer = getTransfersState().transfers.find(
		(item) => item.id === selection.id,
	);
	return transfer ? { kind: "transfer", transfer } : null;
};

export const syncActivitySelection = (items: ActivityItem[]) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(activityStateRef);
		if (items.length === 0) {
			if (state.selected) {
				yield* SubscriptionRef.set(activityStateRef, { selected: null });
			}
			return;
		}

		const hasSelection = state.selected
			? items.some(
					(item) =>
						item.kind === state.selected?.kind && item.id === state.selected.id,
				)
			: false;

		if (hasSelection) return;

		yield* SubscriptionRef.set(activityStateRef, {
			selected: items[0] ?? null,
		});
	});

export const selectNextActivityItem = Effect.gen(function* () {
	const { items } = getActivitySections();
	if (items.length === 0) {
		yield* setSelectedActivity(null);
		return;
	}

	const state = yield* SubscriptionRef.get(activityStateRef);
	const currentIndex = state.selected
		? items.findIndex(
				(item) =>
					item.kind === state.selected?.kind && item.id === state.selected.id,
			)
		: -1;
	const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
	yield* setSelectedActivity(items[nextIndex] ?? null);
});

export const selectPrevActivityItem = Effect.gen(function* () {
	const { items } = getActivitySections();
	if (items.length === 0) {
		yield* setSelectedActivity(null);
		return;
	}

	const state = yield* SubscriptionRef.get(activityStateRef);
	const currentIndex = state.selected
		? items.findIndex(
				(item) =>
					item.kind === state.selected?.kind && item.id === state.selected.id,
			)
		: -1;
	const prevIndex =
		currentIndex === -1
			? items.length - 1
			: (currentIndex - 1 + items.length) % items.length;
	yield* setSelectedActivity(items[prevIndex] ?? null);
});
