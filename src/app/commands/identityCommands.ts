import { homedir } from "node:os";
import { join } from "node:path";
import {
	getIdentityState,
	setIdentity,
	setIdentityError,
	setIdentityLoading,
	setIdentityNotice,
} from "@features/identity/identityState";
import { showToast } from "@features/overlays/toastState";
import { writeToClipboard } from "@shared/clipboard";
import { zend } from "@shared/ipc";
import { Effect } from "effect";
import type { CommandDefinition } from "./types";

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
			const configDir = join(homedir(), ".config", "hermes");
			const filePath = join(
				configDir,
				`hermes-identity-${safeFingerprint}.json`,
			);
			const payload = {
				publicKey: identity.publicKey,
				fingerprint: identity.fingerprint,
				createdAt: identity.createdAt.toISOString(),
			};
			await Bun.write(filePath, JSON.stringify(payload, null, 2), {
				createPath: true,
			});
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
					yield* writeToClipboard(identity.fingerprint);
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

				const filePath = yield* exportIdentityToFile(identity).pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							const message =
								error instanceof Error ? error.message : JSON.stringify(error);
							yield* setIdentityError(message);
							return null;
						}),
					),
				);
				if (!filePath) return;

				const homeDir = homedir();
				const displayPath = filePath.startsWith(homeDir)
					? `~${filePath.slice(homeDir.length)}`
					: filePath;
				yield* showToast({
					message: `Identity exported to ${displayPath}`,
					tone: "success",
				});
			}),
	},
] as const satisfies readonly CommandDefinition[];
