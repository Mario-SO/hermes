import type { FocusedPane, ModalType, SectionId } from "@shared/types";
import type { Effect } from "effect";

export interface PeersCommandHandlers {
	selectNext: () => void;
	selectPrev: () => void;
	trustSelected: () => void;
	deleteSelected: () => void;
}

export interface TransfersCommandHandlers {
	selectNext: () => void;
	selectPrev: () => void;
	cancelSelected: () => void;
}

export interface ReceiveCommandHandlers {
	selectNext: () => void;
	selectPrev: () => void;
	acceptSelected: () => void;
	declineSelected: () => void;
}

export interface ModalCommandHandlers {
	confirm: () => void;
	cancel: () => void;
	nextField: () => void;
	prevField: () => void;
}

export interface CommandContext {
	modalType: ModalType;
	activeSection: SectionId;
	focusedPane: FocusedPane;
	isListening: boolean;
	hasIdentity: boolean;
	peers?: PeersCommandHandlers | null;
	transfers?: TransfersCommandHandlers | null;
	receive?: ReceiveCommandHandlers | null;
	modal?: ModalCommandHandlers | null;
}

export interface KeyBindingConfig {
	key: string;
	preventDefault?: boolean;
}

export type KeyBindingInput = string | KeyBindingConfig;

export type CommandLayerId =
	| "global"
	| "section:identity"
	| "section:peers"
	| "section:transfers"
	| "section:receive"
	| "section:files"
	| "modal:add_peer"
	| "modal:trust_peer"
	| "modal:select_file"
	| "modal:encryption_options"
	| "modal:confirm_send"
	| "modal:decrypt_file"
	| "modal:receive_request"
	| "modal:save_location"
	| "modal:error";

export interface CommandDefinition {
	id: string;
	title: string;
	keys?: KeyBindingInput[];
	layers?: readonly CommandLayerId[];
	when?: (ctx: CommandContext) => boolean;
	run: (
		ctx: CommandContext,
	) => Effect.Effect<unknown, unknown, never> | undefined;
}
