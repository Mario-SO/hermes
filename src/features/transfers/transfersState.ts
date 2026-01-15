import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";
import type { Transfer } from "@shared/types";
import { Effect, SubscriptionRef } from "effect";

export type TransfersState = {
	transfers: Transfer[];
	selectedTransferId: string | null;
	isLoading: boolean;
};

const initialState: TransfersState = {
	transfers: [],
	selectedTransferId: null,
	isLoading: false,
};

export const transfersStateRef = createSubscriptionRef(initialState);

export function useTransfersState(): TransfersState {
	return useSubscriptionValue(transfersStateRef);
}

export function getTransfersState(): TransfersState {
	return getSubscriptionValue(transfersStateRef);
}

export const addTransfer = (transfer: Transfer) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(transfersStateRef, (state) => ({
			...state,
			transfers: [transfer, ...state.transfers],
		}));
	});

export const updateTransfer = (
	transferId: string,
	updates: Partial<Transfer>,
) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(transfersStateRef, (state) => ({
			...state,
			transfers: state.transfers.map((t) =>
				t.id === transferId ? { ...t, ...updates } : t,
			),
		}));
	});

export const updateTransferProgress = (transferId: string, progress: number) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(transfersStateRef, (state) => ({
			...state,
			transfers: state.transfers.map((t) =>
				t.id === transferId ? { ...t, progress } : t,
			),
		}));
	});

export const completeTransfer = (transferId: string, hash: string) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(transfersStateRef, (state) => ({
			...state,
			transfers: state.transfers.map((t) =>
				t.id === transferId
					? {
							...t,
							status: "completed" as const,
							progress: 100,
							hash,
							completedAt: new Date(),
						}
					: t,
			),
		}));
	});

export const failTransfer = (transferId: string, error: string) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(transfersStateRef, (state) => ({
			...state,
			transfers: state.transfers.map((t) =>
				t.id === transferId
					? {
							...t,
							status: "failed" as const,
							error,
							completedAt: new Date(),
						}
					: t,
			),
		}));
	});

export const cancelTransfer = (transferId: string) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(transfersStateRef, (state) => ({
			...state,
			transfers: state.transfers.map((t) =>
				t.id === transferId
					? {
							...t,
							status: "cancelled" as const,
							completedAt: new Date(),
						}
					: t,
			),
		}));
	});

export const selectTransfer = (transferId: string | null) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(transfersStateRef, (state) => ({
			...state,
			selectedTransferId: transferId,
		}));
	});

export const selectNextTransfer = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(transfersStateRef);
	if (state.transfers.length === 0) return;

	const currentIndex = state.transfers.findIndex(
		(t) => t.id === state.selectedTransferId,
	);
	const nextIndex = (currentIndex + 1) % state.transfers.length;
	const nextTransfer = state.transfers[nextIndex];

	if (nextTransfer) {
		yield* SubscriptionRef.set(transfersStateRef, {
			...state,
			selectedTransferId: nextTransfer.id,
		});
	}
});

export const selectPrevTransfer = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(transfersStateRef);
	if (state.transfers.length === 0) return;

	const currentIndex = state.transfers.findIndex(
		(t) => t.id === state.selectedTransferId,
	);
	const prevIndex =
		currentIndex <= 0 ? state.transfers.length - 1 : currentIndex - 1;
	const prevTransfer = state.transfers[prevIndex];

	if (prevTransfer) {
		yield* SubscriptionRef.set(transfersStateRef, {
			...state,
			selectedTransferId: prevTransfer.id,
		});
	}
});

export function getSelectedTransfer(): Transfer | undefined {
	const state = getTransfersState();
	return state.transfers.find((t) => t.id === state.selectedTransferId);
}

export function getActiveTransfers(): Transfer[] {
	return getTransfersState().transfers.filter(
		(t) => t.status === "pending" || t.status === "in_progress",
	);
}
