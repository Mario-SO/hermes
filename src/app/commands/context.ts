import { getFocusedPane } from "@features/focus/focusState";
import { hasIdentity } from "@features/identity/identityState";
import { getNavigationState } from "@features/navigation/navigationState";
import { getModalState } from "@features/overlays/modalState";
import { isListening } from "@features/receive/receiveState";
import type {
	CommandContext,
	ModalCommandHandlers,
	PeersCommandHandlers,
	ReceiveCommandHandlers,
	TransfersCommandHandlers,
} from "./types";

let peersHandlers: PeersCommandHandlers | null = null;
let transfersHandlers: TransfersCommandHandlers | null = null;
let receiveHandlers: ReceiveCommandHandlers | null = null;
let modalHandlers: ModalCommandHandlers | null = null;

export function setPeersCommandHandlers(
	handlers: PeersCommandHandlers | null,
): void {
	peersHandlers = handlers;
}

export function setTransfersCommandHandlers(
	handlers: TransfersCommandHandlers | null,
): void {
	transfersHandlers = handlers;
}

export function setReceiveCommandHandlers(
	handlers: ReceiveCommandHandlers | null,
): void {
	receiveHandlers = handlers;
}

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
		peers: peersHandlers,
		transfers: transfersHandlers,
		receive: receiveHandlers,
		modal: modalHandlers,
	};
}
