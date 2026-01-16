import { BinaryExecutionError, zend } from "@shared/ipc";
import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";
import type { Identity } from "@shared/types";
import { Effect, SubscriptionRef } from "effect";

export type IdentityState = {
	identity: Identity | null;
	isLoading: boolean;
	error: string | null;
	notice: IdentityNotice | null;
};

export type IdentityNotice = {
	message: string;
	tone: "success" | "error";
};

const initialState: IdentityState = {
	identity: null,
	isLoading: false,
	error: null,
	notice: null,
};

export const identityStateRef = createSubscriptionRef(initialState);

export function useIdentityState(): IdentityState {
	return useSubscriptionValue(identityStateRef);
}

export function getIdentityState(): IdentityState {
	return getSubscriptionValue(identityStateRef);
}

export const setIdentityLoading = (isLoading: boolean) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(identityStateRef, (state) => ({
			...state,
			isLoading,
			error: null,
			notice: null,
		}));
	});

export const setIdentity = (identity: Identity) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.set(identityStateRef, {
			identity,
			isLoading: false,
			error: null,
			notice: null,
		});
	});

export const setIdentityError = (error: string) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(identityStateRef, (state) => ({
			...state,
			isLoading: false,
			error,
			notice: null,
		}));
	});

export const setIdentityNotice = (notice: IdentityNotice | null) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(identityStateRef, (state) => ({
			...state,
			notice,
		}));
	});

export const clearIdentity = Effect.gen(function* () {
	yield* SubscriptionRef.set(identityStateRef, initialState);
});

export const loadIdentityFromZend = Effect.gen(function* () {
	yield* setIdentityLoading(true);

	const result = yield* zend.showIdentity.pipe(
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				if (
					error instanceof BinaryExecutionError &&
					error.code === "no_identity"
				) {
					yield* setIdentityLoading(false);
					return null;
				}

				const message =
					error instanceof Error ? error.message : JSON.stringify(error);
				yield* setIdentityError(message);
				return null;
			}),
		),
	);

	if (!result) {
		return;
	}

	yield* setIdentity({
		publicKey: result.publicKey,
		fingerprint: result.fingerprint,
		createdAt: new Date(),
	});
});

// Helper to check if identity exists
export function hasIdentity(): boolean {
	return getIdentityState().identity !== null;
}
