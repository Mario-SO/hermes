import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";
import type { IncomingRequest, ReceiveStatus } from "@shared/types";
import { Effect, SubscriptionRef } from "effect";

export type ReceiveState = {
	status: ReceiveStatus;
	incomingRequests: IncomingRequest[];
	selectedRequestId: string | null;
	defaultSavePath: string;
	error: string | null;
};

const initialState: ReceiveState = {
	status: "idle",
	incomingRequests: [],
	selectedRequestId: null,
	defaultSavePath: "~/Downloads",
	error: null,
};

export const receiveStateRef = createSubscriptionRef(initialState);

export function useReceiveState(): ReceiveState {
	return useSubscriptionValue(receiveStateRef);
}

export function getReceiveState(): ReceiveState {
	return getSubscriptionValue(receiveStateRef);
}

export const startListening = Effect.gen(function* () {
	yield* SubscriptionRef.update(receiveStateRef, (state) => ({
		...state,
		status: "listening" as const,
		error: null,
	}));
});

export const stopListening = Effect.gen(function* () {
	yield* SubscriptionRef.update(receiveStateRef, (state) => ({
		...state,
		status: "idle" as const,
	}));
});

export const addIncomingRequest = (request: IncomingRequest) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(receiveStateRef, (state) => ({
			...state,
			incomingRequests: [request, ...state.incomingRequests],
		}));
	});

export const removeIncomingRequest = (requestId: string) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(receiveStateRef, (state) => ({
			...state,
			incomingRequests: state.incomingRequests.filter(
				(r) => r.id !== requestId,
			),
			selectedRequestId:
				state.selectedRequestId === requestId ? null : state.selectedRequestId,
		}));
	});

export const selectRequest = (requestId: string | null) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(receiveStateRef, (state) => ({
			...state,
			selectedRequestId: requestId,
		}));
	});

export const selectNextRequest = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(receiveStateRef);
	if (state.incomingRequests.length === 0) return;

	const currentIndex = state.incomingRequests.findIndex(
		(r) => r.id === state.selectedRequestId,
	);
	const nextIndex = (currentIndex + 1) % state.incomingRequests.length;
	const nextRequest = state.incomingRequests[nextIndex];

	if (nextRequest) {
		yield* SubscriptionRef.set(receiveStateRef, {
			...state,
			selectedRequestId: nextRequest.id,
		});
	}
});

export const selectPrevRequest = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(receiveStateRef);
	if (state.incomingRequests.length === 0) return;

	const currentIndex = state.incomingRequests.findIndex(
		(r) => r.id === state.selectedRequestId,
	);
	const prevIndex =
		currentIndex <= 0 ? state.incomingRequests.length - 1 : currentIndex - 1;
	const prevRequest = state.incomingRequests[prevIndex];

	if (prevRequest) {
		yield* SubscriptionRef.set(receiveStateRef, {
			...state,
			selectedRequestId: prevRequest.id,
		});
	}
});

export const setDefaultSavePath = (path: string) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(receiveStateRef, (state) => ({
			...state,
			defaultSavePath: path,
		}));
	});

export const setReceiveError = (error: string) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(receiveStateRef, (state) => ({
			...state,
			status: "idle" as const,
			error,
		}));
	});

export function getSelectedRequest(): IncomingRequest | undefined {
	const state = getReceiveState();
	return state.incomingRequests.find((r) => r.id === state.selectedRequestId);
}

export function isListening(): boolean {
	return getReceiveState().status === "listening";
}
