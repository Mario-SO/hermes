import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";
import type { ModalState, ModalType } from "@shared/types";
import { Effect, SubscriptionRef } from "effect";

const initialModalState: ModalState = {
	type: "none",
	data: undefined,
};

export const modalStateRef = createSubscriptionRef(initialModalState);

export const openModal = (type: ModalType, data?: unknown) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.set(modalStateRef, { type, data });
	});

export const closeModal = Effect.gen(function* () {
	yield* SubscriptionRef.set(modalStateRef, {
		type: "none",
		data: undefined,
	});
});

export const updateModalData = (data: unknown) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(modalStateRef, (state) => ({
			...state,
			data,
		}));
	});

export function useModalState(): ModalState {
	return useSubscriptionValue(modalStateRef);
}

export function getModalState(): ModalState {
	return getSubscriptionValue(modalStateRef);
}

// Typed modal openers for convenience
export const openTrustPeerModal = (peerData: unknown) =>
	openModal("trust_peer", peerData);
export const openDecryptFileModal = (fileData: unknown) =>
	openModal("decrypt_file", fileData);
export const openSaveLocationModal = (requestData: unknown) =>
	openModal("save_location", requestData);
export const openErrorModal = (errorMessage: string) =>
	openModal("error", { message: errorMessage });
