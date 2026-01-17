import { join } from "node:path";
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

type PersistedTransfer = Omit<Transfer, "startedAt" | "completedAt"> & {
	startedAt: string;
	completedAt?: string;
};

type PersistedTransfersState = {
	transfers: PersistedTransfer[];
	selectedTransferId: string | null;
};

const initialState: TransfersState = {
	transfers: [],
	selectedTransferId: null,
	isLoading: false,
};

export const transfersStateRef = createSubscriptionRef(initialState);

const getTransfersStorageDir = (): string => {
	const home = process.env.HOME;
	if (home) return join(home, ".config", "hermes");
	return join(process.cwd(), ".config", "hermes");
};

const getTransfersStoragePath = (): string =>
	join(getTransfersStorageDir(), "transfers.json");

const serializeTransfer = (transfer: Transfer): PersistedTransfer => ({
	...transfer,
	startedAt: transfer.startedAt.toISOString(),
	completedAt: transfer.completedAt?.toISOString(),
});

const deserializeTransfer = (transfer: PersistedTransfer): Transfer => ({
	...transfer,
	startedAt: new Date(transfer.startedAt),
	completedAt: transfer.completedAt
		? new Date(transfer.completedAt)
		: undefined,
});

const persistTransfers = Effect.gen(function* () {
	const storagePath = getTransfersStoragePath();

	const state = yield* SubscriptionRef.get(transfersStateRef);
	const payload: PersistedTransfersState = {
		transfers: state.transfers.map(serializeTransfer),
		selectedTransferId: state.selectedTransferId,
	};

	yield* Effect.tryPromise({
		try: () =>
			Bun.write(storagePath, `${JSON.stringify(payload, null, 2)}\n`, {
				createPath: true,
			}),
		catch: () => undefined,
	});
});

export const loadTransfersFromDisk = Effect.gen(function* () {
	const storagePath = getTransfersStoragePath();
	const file = Bun.file(storagePath);
	const exists = yield* Effect.tryPromise({
		try: () => file.exists(),
		catch: () => false,
	});
	if (!exists) return;

	const contents = yield* Effect.tryPromise({
		try: () => file.text(),
		catch: () => "",
	});
	if (!contents.trim()) return;

	const parsed = JSON.parse(contents) as PersistedTransfersState;
	if (!parsed || !Array.isArray(parsed.transfers)) return;

	const transfers = parsed.transfers.map(deserializeTransfer);
	const selectedTransferId = transfers.some(
		(t) => t.id === parsed.selectedTransferId,
	)
		? parsed.selectedTransferId
		: (transfers[0]?.id ?? null);

	yield* SubscriptionRef.set(transfersStateRef, {
		...initialState,
		transfers,
		selectedTransferId,
	});
});

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
		yield* persistTransfers;
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
		yield* persistTransfers;
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
		yield* persistTransfers;
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
		yield* persistTransfers;
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
		yield* persistTransfers;
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
