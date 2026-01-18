import { activityCommands } from "./activityCommands";
import { appCommands } from "./appCommands";
import { focusCommands } from "./focusCommands";
import { identityCommands } from "./identityCommands";
import { navigationCommands } from "./navigationCommands";
import { peersCommands } from "./peersCommands";
import type { CommandDefinition } from "./types";

export const allCommands = [
	...appCommands,
	...focusCommands,
	...navigationCommands,
	...identityCommands,
	...peersCommands,
	...activityCommands,
] as const satisfies readonly CommandDefinition[];

export type CommandId = (typeof allCommands)[number]["id"];

export const commandById = new Map<CommandId, CommandDefinition>(
	allCommands.map((command) => [command.id, command]),
);
