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
	isLoading: boolean;
};

type PersistedTransfer = Omit<Transfer, "startedAt" | "completedAt"> & {
	startedAt: string;
	completedAt?: string;
};

type PersistedTransfersState = {
	transfers: PersistedTransfer[];
	selectedTransferId?: string | null;
};

const initialState: TransfersState = {
	transfers: [],
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

	yield* SubscriptionRef.set(transfersStateRef, {
		...initialState,
		transfers,
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
