import { allCommands, type CommandId, commandById } from "./registry";
import type {
	CommandContext,
	CommandDefinition,
	CommandLayerId,
	KeyBindingInput,
} from "./types";

interface KeyChord {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean;
}

export interface KeyBinding extends KeyChord {
	commandId: CommandId;
	preventDefault?: boolean;
	display: string;
}

export interface KeymapLayer {
	id: CommandLayerId;
	bindings: KeyBinding[];
	when?: (ctx: CommandContext) => boolean;
}

export interface KeyPress {
	name?: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean;
	preventDefault?: () => void;
}

const KEY_LABELS: Record<string, string> = {
	escape: "Esc",
	return: "Enter",
	tab: "Tab",
	up: "↑",
	down: "↓",
	left: "←",
	right: "→",
	space: "Space",
	backspace: "Backspace",
	delete: "Del",
};

const layerDefinitions: Array<Omit<KeymapLayer, "bindings">> = [
	// Modal layers (highest priority)
	{
		id: "modal:error",
		when: (ctx) => ctx.modalType === "error",
	},
	{
		id: "modal:save_location",
		when: (ctx) => ctx.modalType === "save_location",
	},
	{
		id: "modal:receive_request",
		when: (ctx) => ctx.modalType === "receive_request",
	},
	{
		id: "modal:confirm_send",
		when: (ctx) => ctx.modalType === "confirm_send",
	},
	{
		id: "modal:decrypt_file",
		when: (ctx) => ctx.modalType === "decrypt_file",
	},
	{
		id: "modal:encryption_options",
		when: (ctx) => ctx.modalType === "encryption_options",
	},
	{
		id: "modal:select_file",
		when: (ctx) => ctx.modalType === "select_file",
	},
	{
		id: "modal:trust_peer",
		when: (ctx) => ctx.modalType === "trust_peer",
	},
	{
		id: "modal:add_peer",
		when: (ctx) => ctx.modalType === "add_peer",
	},
	// Section layers
	{
		id: "section:identity",
		when: (ctx) => ctx.modalType === "none" && ctx.activeSection === "identity",
	},
	{
		id: "section:peers",
		when: (ctx) => ctx.modalType === "none" && ctx.activeSection === "peers",
	},
	{
		id: "section:transfers",
		when: (ctx) =>
			ctx.modalType === "none" && ctx.activeSection === "transfers",
	},
	{
		id: "section:receive",
		when: (ctx) => ctx.modalType === "none" && ctx.activeSection === "receive",
	},
	{
		id: "section:files",
		when: (ctx) => ctx.modalType === "none" && ctx.activeSection === "files",
	},
	// Global layer (lowest priority when no modal is open)
	{
		id: "global",
		when: (ctx) => ctx.modalType === "none",
	},
];

export const keymapLayers: KeymapLayer[] = layerDefinitions.map((layer) => ({
	...layer,
	bindings: buildBindingsForLayer(layer.id),
}));

export function getActiveLayers(ctx: CommandContext): KeymapLayer[] {
	return keymapLayers.filter((layer) => (layer.when ? layer.when(ctx) : true));
}

export function resolveKeyBinding(
	keyPress: KeyPress,
	ctx: CommandContext,
): KeyBinding | null {
	const layers = getActiveLayers(ctx);
	for (const layer of layers) {
		for (const binding of layer.bindings) {
			if (!matchesKeyPress(binding, keyPress)) continue;
			const command = commandById.get(binding.commandId);
			if (command?.when && !command.when(ctx)) continue;
			return binding;
		}
	}
	return null;
}

function buildBindingsForLayer(layerId: CommandLayerId): KeyBinding[] {
	const bindings: KeyBinding[] = [];
	for (const command of allCommands) {
		const layers = command.layers as CommandDefinition["layers"];
		if (!layers?.includes(layerId)) continue;
		if (!command.keys) continue;

		for (const keyInput of command.keys) {
			const { key, preventDefault } = normalizeKeyInput(keyInput);
			const chord = parseKeyChord(key);
			if (!chord.key) continue;

			const display = formatKeyDisplay(chord);
			bindings.push({
				commandId: command.id as CommandId,
				key: chord.key,
				ctrl: chord.ctrl,
				shift: chord.shift,
				alt: chord.alt,
				meta: chord.meta,
				preventDefault,
				display,
			});
		}
	}
	return bindings;
}

function normalizeKeyInput(keyInput: KeyBindingInput): {
	key: string;
	preventDefault?: boolean;
} {
	if (typeof keyInput === "string") {
		return { key: keyInput };
	}
	return keyInput;
}

function parseKeyChord(input: string): KeyChord {
	const parts = input
		.split("+")
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);
	const key = parts.pop() ?? "";
	const modifiers = new Set(parts);

	return {
		key: normalizeKeyName(key),
		ctrl: modifiers.has("ctrl") || modifiers.has("control"),
		shift: modifiers.has("shift"),
		alt: modifiers.has("alt") || modifiers.has("option"),
		meta:
			modifiers.has("meta") || modifiers.has("cmd") || modifiers.has("command"),
	};
}

function matchesKeyPress(binding: KeyBinding, keyPress: KeyPress): boolean {
	if (!keyPress.name) return false;

	const keyName = normalizeKeyName(keyPress.name);
	if (keyName !== binding.key) return false;
	if (Boolean(binding.ctrl) !== Boolean(keyPress.ctrl)) return false;
	if (Boolean(binding.shift) !== Boolean(keyPress.shift)) return false;
	if (Boolean(binding.alt) !== Boolean(keyPress.alt)) return false;
	if (Boolean(binding.meta) !== Boolean(keyPress.meta)) return false;

	return true;
}

function formatKeyDisplay(chord: KeyChord): string {
	const parts: string[] = [];
	if (chord.ctrl) parts.push("Ctrl");
	if (chord.alt) parts.push("Alt");
	if (chord.shift) parts.push("Shift");
	if (chord.meta) parts.push("Meta");

	const keyLabel =
		KEY_LABELS[chord.key] ??
		(chord.key.length === 1 ? chord.key.toUpperCase() : chord.key);
	parts.push(keyLabel);
	return parts.join("+");
}

function normalizeKeyName(key: string): string {
	return key.toLowerCase();
}
