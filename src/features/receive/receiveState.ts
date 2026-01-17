import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";
import type { IncomingRequest, ReceiveStatus, Transfer } from "@shared/types";
import {
	BinaryExecutionError,
	BinaryNotFoundError,
	JsonParseError,
	zend,
} from "@shared/ipc";
import {
	addTransfer,
	cancelTransfer,
	completeTransfer,
	failTransfer,
	updateTransfer,
	updateTransferProgress,
} from "@features/transfers/transfersState";
import { getPeersState } from "@features/peers/peersState";
import { Effect, Fiber, Stream, SubscriptionRef } from "effect";

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
	defaultSavePath: process.cwd(),
	error: null,
};

export const receiveStateRef = createSubscriptionRef(initialState);

let receiveStreamFiber: Fiber.RuntimeFiber<unknown, void> | null = null;
let activeReceiveTransferId: string | null = null;
let activeReceivePeerId: string | null = null;

const formatReceiveError = (error: unknown): string => {
	if (error instanceof BinaryExecutionError) {
		if (error.code === "no_identity") {
			return "No identity found. Create one before listening.";
		}
		return error.message;
	}
	if (error instanceof BinaryNotFoundError) {
		return `Missing ${error.binary} binary at ${error.path}`;
	}
	if (error instanceof JsonParseError) {
		return `Failed to parse ${error.binary} output`;
	}
	return error instanceof Error ? error.message : JSON.stringify(error);
};

const resolvePeerId = (peerId?: string | null): string => {
	if (!peerId) return "unknown";
	const { peers } = getPeersState();
	const match = peers.find(
		(peer) => peer.id === peerId || peer.fingerprint === peerId,
	);
	return match?.id ?? peerId;
};

const stopReceiveStream = () => {
	if (!receiveStreamFiber) return;
	Effect.runFork(Fiber.interrupt(receiveStreamFiber));
	receiveStreamFiber = null;
};

const resetReceiveSession = () => {
	activeReceiveTransferId = null;
	activeReceivePeerId = null;
};

const beginReceiveTransfer = (
	fileName: string,
	fileSize: number,
	peerId: string | undefined,
) =>
	Effect.gen(function* () {
		const transferId = `transfer-${Date.now()}`;
		activeReceiveTransferId = transferId;
		activeReceivePeerId = resolvePeerId(peerId);

		const transfer: Transfer = {
			id: transferId,
			direction: "receive",
			peerId: activeReceivePeerId ?? "unknown",
			fileName,
			fileSize,
			progress: 0,
			status: "in_progress",
			startedAt: new Date(),
		};

		yield* addTransfer(transfer);
		yield* SubscriptionRef.update(receiveStateRef, (state) => ({
			...state,
			status: "receiving" as const,
			error: null,
		}));
	});

const updateReceiveProgress = (bytes: number, percent: number) =>
	Effect.gen(function* () {
		if (!activeReceiveTransferId) {
			yield* beginReceiveTransfer("Receiving file...", 0, activeReceivePeerId);
		}

		if (!activeReceiveTransferId) return;

		const clamped = Math.max(0, Math.min(100, Math.round(percent)));
		yield* updateTransferProgress(activeReceiveTransferId, clamped);

		if (percent > 0) {
			const estimatedSize = Math.round(bytes / (percent / 100));
			if (Number.isFinite(estimatedSize) && estimatedSize > 0) {
				yield* updateTransfer(activeReceiveTransferId, {
					fileSize: estimatedSize,
				});
			}
		}
	});

const completeReceiveTransfer = (fileName: string, hash: string) =>
	Effect.gen(function* () {
		if (!activeReceiveTransferId) {
			yield* beginReceiveTransfer(fileName, 0, activeReceivePeerId);
		}

		if (!activeReceiveTransferId) return;

		yield* updateTransfer(activeReceiveTransferId, { fileName });
		yield* completeTransfer(activeReceiveTransferId, hash);
		resetReceiveSession();
		yield* SubscriptionRef.update(receiveStateRef, (state) => ({
			...state,
			status: "idle" as const,
		}));
	});

const failReceiveTransfer = (message: string) =>
	Effect.gen(function* () {
		if (activeReceiveTransferId) {
			yield* failTransfer(activeReceiveTransferId, message);
		}
		resetReceiveSession();
		yield* setReceiveError(message);
	});

const handleReceiveEvent = (event: { event: string; [key: string]: unknown }) =>
	Effect.gen(function* () {
		switch (event.event) {
			case "listening":
				yield* SubscriptionRef.update(receiveStateRef, (state) => ({
					...state,
					status: "listening" as const,
					error: null,
				}));
				return;
			case "handshake_complete":
				activeReceivePeerId = resolvePeerId(event.peer as string | undefined);
				return;
			case "transfer_start":
				yield* beginReceiveTransfer(
					String(event.file ?? "Receiving file..."),
					Number(event.size ?? 0),
					String(event.peer ?? activeReceivePeerId ?? "unknown"),
				);
				return;
			case "progress":
				yield* updateReceiveProgress(
					Number(event.bytes ?? 0),
					Number(event.percent ?? 0),
				);
				return;
			case "transfer_complete":
				yield* completeReceiveTransfer(
					String(event.file ?? "Unknown"),
					String(event.hash ?? ""),
				);
				return;
			case "incoming_request": {
				const request: IncomingRequest = {
					id: String(event.request_id ?? `req-${Date.now()}`),
					peerId: resolvePeerId(event.peer as string | undefined),
					peerFingerprint: String(event.peer_fingerprint ?? ""),
					fileName: String(event.file ?? "Unknown"),
					fileSize: Number(event.size ?? 0),
					receivedAt: new Date(),
				};
				yield* addIncomingRequest(request);
				return;
			}
			case "receive_start":
				yield* SubscriptionRef.update(receiveStateRef, (state) => ({
					...state,
					status: "receiving" as const,
				}));
				return;
			case "receive_complete":
				yield* SubscriptionRef.update(receiveStateRef, (state) => ({
					...state,
					status: "idle" as const,
				}));
				return;
			case "error":
				yield* failReceiveTransfer(String(event.message ?? "Receive error"));
				return;
			default:
				return;
		}
	});

const finalizeReceiveStream = Effect.gen(function* () {
	resetReceiveSession();
	receiveStreamFiber = null;
	yield* SubscriptionRef.update(receiveStateRef, (state) => ({
		...state,
		status: "idle" as const,
	}));
});

const startReceiveStream = () => {
	stopReceiveStream();

	const streamEffect = Stream.runForEach(
		zend.createEventStream(),
		handleReceiveEvent,
	).pipe(
		Effect.catchAll((error) => setReceiveError(formatReceiveError(error))),
		Effect.ensuring(finalizeReceiveStream),
	);

	receiveStreamFiber = Effect.runFork(streamEffect);
};

export function useReceiveState(): ReceiveState {
	return useSubscriptionValue(receiveStateRef);
}

export function getReceiveState(): ReceiveState {
	return getSubscriptionValue(receiveStateRef);
}

export const startListening = Effect.gen(function* () {
	stopReceiveStream();
	resetReceiveSession();

	const result = yield* zend.startReceiving().pipe(
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				yield* setReceiveError(formatReceiveError(error));
				return null;
			}),
		),
	);

	if (!result) return;

	yield* SubscriptionRef.update(receiveStateRef, (state) => ({
		...state,
		status: "listening" as const,
		error: null,
	}));
	startReceiveStream();
});

export const stopListening = Effect.gen(function* () {
	const transferId = activeReceiveTransferId;
	stopReceiveStream();
	if (transferId) {
		yield* cancelTransfer(transferId);
	}
	resetReceiveSession();
	yield* zend.stopReceiving;
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
	return getReceiveState().status !== "idle";
}
