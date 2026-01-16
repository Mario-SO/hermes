import { homedir } from "node:os";
import { join } from "node:path";
import {
	getIdentityState,
	setIdentity,
	setIdentityError,
	setIdentityLoading,
	setIdentityNotice,
} from "@features/identity/identityState";
import { zend } from "@shared/ipc";
import { Effect } from "effect";
import type { CommandDefinition } from "./types";

const getClipboardCommands = (): Array<{ cmd: string; args: string[] }> => {
	switch (process.platform) {
		case "darwin":
			return [{ cmd: "pbcopy", args: [] }];
		case "win32":
			return [{ cmd: "clip", args: [] }];
		default:
			return [
				{ cmd: "wl-copy", args: [] },
				{ cmd: "xclip", args: ["-selection", "clipboard"] },
			];
	}
};

const copyToClipboard = (text: string) =>
	Effect.tryPromise({
		try: async () => {
			const commands = getClipboardCommands();
			let lastError: Error | null = null;

			for (const { cmd, args } of commands) {
				try {
					const proc = Bun.spawn({
						cmd: [cmd, ...args],
						stdin: "pipe",
						stdout: "ignore",
						stderr: "pipe",
					});

					if (proc.stdin) {
						proc.stdin.write(text);
						proc.stdin.end();
					}

					const exitCode = await proc.exited;
					if (exitCode === 0) {
						return;
					}

					const stderr = await new Response(proc.stderr).text();
					throw new Error(stderr.trim() || `Clipboard command failed: ${cmd}`);
				} catch (error) {
					lastError = error instanceof Error ? error : new Error(String(error));
				}
			}

			throw (
				lastError ?? new Error("No clipboard command available on this system.")
			);
		},
		catch: (error) =>
			error instanceof Error ? error : new Error(String(error)),
	});

const showIdentityNotice = (notice: {
	message: string;
	tone: "success" | "error";
}) =>
	Effect.gen(function* () {
		yield* setIdentityNotice(notice);
		yield* Effect.sleep("2 seconds");
		yield* setIdentityNotice(null);
	});

const exportIdentityToFile = (identity: {
	publicKey: string;
	fingerprint: string;
	createdAt: Date;
}) =>
	Effect.tryPromise({
		try: async () => {
			const safeFingerprint = identity.fingerprint.replace(/[^a-zA-Z0-9]/g, "");
			const filePath = join(
				homedir(),
				`hermes-identity-${safeFingerprint}.json`,
			);
			const payload = {
				publicKey: identity.publicKey,
				fingerprint: identity.fingerprint,
				createdAt: identity.createdAt.toISOString(),
			};
			await Bun.write(filePath, JSON.stringify(payload, null, 2));
			return filePath;
		},
		catch: (error) =>
			error instanceof Error ? error : new Error(String(error)),
	});

export const identityCommands = [
	{
		id: "identity.create",
		title: "Create Identity",
		keys: ["n"],
		layers: ["global", "section:identity"],
		when: (ctx) =>
			!ctx.hasIdentity &&
			ctx.activeSection === "identity" &&
			ctx.focusedPane === "main",
		run: () =>
			Effect.gen(function* () {
				yield* setIdentityLoading(true);

				const result = yield* zend.initIdentity.pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							const message =
								error instanceof Error ? error.message : JSON.stringify(error);
							yield* setIdentityError(message);
							return null;
						}),
					),
				);

				if (!result) {
					return;
				}

				yield* setIdentity({
					publicKey: result.publicKey,
					fingerprint: result.fingerprint,
					createdAt: new Date(),
				});
			}),
	},
	{
		id: "identity.copy",
		title: "Copy Fingerprint",
		keys: ["c"],
		layers: ["section:identity"],
		when: (ctx) =>
			ctx.hasIdentity &&
			ctx.activeSection === "identity" &&
			ctx.focusedPane === "main",
		run: () =>
			Effect.gen(function* () {
				const identity = getIdentityState().identity;
				if (!identity) {
					yield* showIdentityNotice({
						message: "No identity available to copy.",
						tone: "error",
					});
					return;
				}

				try {
					yield* copyToClipboard(identity.fingerprint);
					yield* showIdentityNotice({
						message: "Fingerprint copied to clipboard.",
						tone: "success",
					});
				} catch (error) {
					const message =
						error instanceof Error ? error.message : JSON.stringify(error);
					yield* showIdentityNotice({ message, tone: "error" });
				}
			}),
	},
	{
		id: "identity.export",
		title: "Export Identity",
		keys: ["e"],
		layers: ["section:identity"],
		when: (ctx) =>
			ctx.hasIdentity &&
			ctx.activeSection === "identity" &&
			ctx.focusedPane === "main",
		run: () =>
			Effect.gen(function* () {
				const identity = getIdentityState().identity;
				if (!identity) {
					yield* setIdentityError("No identity available to export.");
					return;
				}

				yield* exportIdentityToFile(identity).pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							const message =
								error instanceof Error ? error.message : JSON.stringify(error);
							yield* setIdentityError(message);
						}),
					),
				);
			}),
	},
] as const satisfies readonly CommandDefinition[];
