import { getFocusedPane } from "@features/focus/focusState";
import { hasIdentity } from "@features/identity/identityState";
import { getNavigationState } from "@features/navigation/navigationState";
import { getModalState } from "@features/overlays/modalState";
import { isListening } from "@features/receive/receiveState";
import type { CommandContext, ModalCommandHandlers } from "./types";

let modalHandlers: ModalCommandHandlers | null = null;

export function setModalCommandHandlers(
	handlers: ModalCommandHandlers | null,
): void {
	modalHandlers = handlers;
}

export function getCommandContext(): CommandContext {
	const modalState = getModalState();
	const navigationState = getNavigationState();

	return {
		modalType: modalState.type,
		activeSection: navigationState.activeSection,
		focusedPane: getFocusedPane(),
		isListening: isListening(),
		hasIdentity: hasIdentity(),
		modal: modalHandlers,
	};
}
