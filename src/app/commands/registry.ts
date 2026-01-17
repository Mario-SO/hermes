import { appCommands } from "./appCommands";
import { filesCommands } from "./filesCommands";
import { focusCommands } from "./focusCommands";
import { identityCommands } from "./identityCommands";
import { navigationCommands } from "./navigationCommands";
import { peersCommands } from "./peersCommands";
import { receiveCommands } from "./receiveCommands";
import { transfersCommands } from "./transfersCommands";
import type { CommandDefinition } from "./types";

export const allCommands = [
	...appCommands,
	...focusCommands,
	...navigationCommands,
	...identityCommands,
	...peersCommands,
	...filesCommands,
	...transfersCommands,
	...receiveCommands,
] as const satisfies readonly CommandDefinition[];

export type CommandId = (typeof allCommands)[number]["id"];

export const commandById = new Map<CommandId, CommandDefinition>(
	allCommands.map((command) => [command.id, command]),
);
