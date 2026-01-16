import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";
import { Effect, SubscriptionRef } from "effect";

export type ToastTone = "success" | "error" | "info" | "warning";

export type Toast = {
	message: string;
	tone: ToastTone;
};

const toastStateRef = createSubscriptionRef<Toast | null>(null);

export function useToastState(): Toast | null {
	return useSubscriptionValue(toastStateRef);
}

export function getToastState(): Toast | null {
	return getSubscriptionValue(toastStateRef);
}

export const setToast = (toast: Toast | null) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.set(toastStateRef, toast);
	});

export const showToast = (
	toast: Toast,
	duration: string = "2 seconds",
) =>
	Effect.gen(function* () {
		yield* setToast(toast);
		yield* Effect.sleep(duration);
		yield* setToast(null);
	});
