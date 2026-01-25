import type { FocusedPane, ModalType, SectionId } from "@shared/types";
import type { Effect } from "effect";

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
	| "section:activity"
	| "modal:add_peer"
	| "modal:trust_peer"
	| "modal:help"
	| "modal:select_file"
	| "modal:encryption_options"
	| "modal:confirm_send"
	| "modal:decrypt_file"
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
