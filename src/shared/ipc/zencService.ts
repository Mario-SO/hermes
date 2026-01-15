/**
 * Zenc IPC Service - Encryption Engine Interface
 *
 * This service spawns the zenc binary and communicates via JSON over stdio.
 * All operations are one-shot: spawn binary, optionally write to stdin, parse output.
 */

import { Effect } from "effect";
import { spawnAndCollect, spawnAndGetDone, spawnAndGetFirst } from "./spawn";
import {
	BinaryExecutionError,
	type BinaryNotFoundError,
	type JsonParseError,
	type ZencCommand,
	type ZencDoneEvent,
	type ZencEvent,
	type ZencKeygenEvent,
} from "./types";

// =============================================================================
// Service Error Type
// =============================================================================

export type ZencServiceError =
	| BinaryNotFoundError
	| BinaryExecutionError
	| JsonParseError;

// =============================================================================
// Keygen
// =============================================================================

export interface KeypairResult {
	publicKey: string;
	secretKey: string;
}

/**
 * Generate a new keypair using zenc keygen.
 */
export const generateKeypair = Effect.gen(function* () {
	const event = yield* spawnAndGetFirst<ZencEvent, ZencKeygenEvent>(
		{
			binary: "zenc",
			args: ["keygen"],
		},
		"keygen",
	);

	return {
		publicKey: event.public_key,
		secretKey: event.secret_key,
	} satisfies KeypairResult;
});

// =============================================================================
// Encrypt
// =============================================================================

export interface EncryptResult {
	encryptedPath: string;
	originalPath: string;
	hash: string;
	method: "password" | "public_key";
}

export interface EncryptOptions {
	toPublicKey?: string;
	password?: string;
}

/**
 * Encrypt a file using zenc.
 *
 * @param filePath - Path to the file to encrypt
 * @param options - Either toPublicKey or password must be provided
 */
export const encryptFile = (
	filePath: string,
	options: EncryptOptions,
): Effect.Effect<EncryptResult, ZencServiceError> =>
	Effect.gen(function* () {
		const args: string[] = ["encrypt", filePath];
		let stdin: string | undefined;
		let method: "password" | "public_key";

		if (options.toPublicKey) {
			args.push("--to", options.toPublicKey);
			method = "public_key";
		} else if (options.password) {
			args.push("--password");
			stdin = options.password;
			method = "password";
		} else {
			return yield* Effect.fail(
				new BinaryExecutionError(
					"zenc",
					"missing_option",
					"Either toPublicKey or password must be provided",
				),
			);
		}

		const doneEvent = yield* spawnAndGetDone<ZencDoneEvent>({
			binary: "zenc",
			args,
			stdin,
		});

		return {
			encryptedPath: doneEvent.output,
			originalPath: filePath,
			hash: doneEvent.hash,
			method,
		} satisfies EncryptResult;
	});

// =============================================================================
// Decrypt
// =============================================================================

export interface DecryptResult {
	decryptedPath: string;
	originalPath: string;
	hash: string;
}

export interface DecryptOptions {
	/** Secret key for public-key encrypted files */
	secretKey?: string;
	/** Password for password-encrypted files */
	password?: string;
}

/**
 * Decrypt a file using zenc.
 * Mode is auto-detected from the file header.
 *
 * @param filePath - Path to the encrypted file
 * @param options - Either secretKey or password depending on encryption mode
 */
export const decryptFile = (
	filePath: string,
	options: DecryptOptions,
): Effect.Effect<DecryptResult, ZencServiceError> =>
	Effect.gen(function* () {
		const args: string[] = ["decrypt", filePath];

		// Password or secret key is provided via stdin
		const stdin = options.password ?? options.secretKey;

		if (!stdin) {
			return yield* Effect.fail(
				new BinaryExecutionError(
					"zenc",
					"missing_option",
					"Either secretKey or password must be provided",
				),
			);
		}

		const doneEvent = yield* spawnAndGetDone<ZencDoneEvent>({
			binary: "zenc",
			args,
			stdin,
		});

		return {
			decryptedPath: doneEvent.output,
			originalPath: filePath,
			hash: doneEvent.hash,
		} satisfies DecryptResult;
	});

// =============================================================================
// Hash Verification
// =============================================================================

export interface VerifyHashResult {
	valid: boolean;
	actualHash: string;
	expectedHash: string;
}

/**
 * Verify a file hash by re-encrypting/decrypting and comparing hashes.
 * This uses the hash from the most recent zenc operation.
 *
 * Note: For a standalone hash verification, we would need zenc to support
 * a hash-only command. For now, this compares a known hash with an expected value.
 */
export const verifyHash = (
	actualHash: string,
	expectedHash: string,
): Effect.Effect<VerifyHashResult, never> =>
	Effect.succeed({
		valid: actualHash === expectedHash,
		actualHash,
		expectedHash,
	});

// =============================================================================
// Progress Streaming
// =============================================================================

/**
 * Encrypt a file and collect all events including progress.
 * Useful for displaying progress in the UI.
 */
export const encryptFileWithProgress = (
	filePath: string,
	options: EncryptOptions,
): Effect.Effect<
	{ events: ZencEvent[]; result: EncryptResult },
	ZencServiceError
> =>
	Effect.gen(function* () {
		const args: string[] = ["encrypt", filePath];
		let stdin: string | undefined;
		let method: "password" | "public_key";

		if (options.toPublicKey) {
			args.push("--to", options.toPublicKey);
			method = "public_key";
		} else if (options.password) {
			args.push("--password");
			stdin = options.password;
			method = "password";
		} else {
			return yield* Effect.fail(
				new BinaryExecutionError(
					"zenc",
					"missing_option",
					"Either toPublicKey or password must be provided",
				),
			);
		}

		const { events } = yield* spawnAndCollect<ZencEvent>({
			binary: "zenc",
			args,
			stdin,
		});

		const doneEvent = events.find(
			(e): e is ZencDoneEvent => e.event === "done",
		);
		if (!doneEvent) {
			return yield* Effect.fail(
				new BinaryExecutionError(
					"zenc",
					"missing_done",
					"Expected 'done' event not found",
				),
			);
		}

		return {
			events,
			result: {
				encryptedPath: doneEvent.output,
				originalPath: filePath,
				hash: doneEvent.hash,
				method,
			},
		};
	});

/**
 * Decrypt a file and collect all events including progress.
 * Useful for displaying progress in the UI.
 */
export const decryptFileWithProgress = (
	filePath: string,
	options: DecryptOptions,
): Effect.Effect<
	{ events: ZencEvent[]; result: DecryptResult },
	ZencServiceError
> =>
	Effect.gen(function* () {
		const args: string[] = ["decrypt", filePath];
		const stdin = options.password ?? options.secretKey;

		if (!stdin) {
			return yield* Effect.fail(
				new BinaryExecutionError(
					"zenc",
					"missing_option",
					"Either secretKey or password must be provided",
				),
			);
		}

		const { events } = yield* spawnAndCollect<ZencEvent>({
			binary: "zenc",
			args,
			stdin,
		});

		const doneEvent = events.find(
			(e): e is ZencDoneEvent => e.event === "done",
		);
		if (!doneEvent) {
			return yield* Effect.fail(
				new BinaryExecutionError(
					"zenc",
					"missing_done",
					"Expected 'done' event not found",
				),
			);
		}

		return {
			events,
			result: {
				decryptedPath: doneEvent.output,
				originalPath: filePath,
				hash: doneEvent.hash,
			},
		};
	});

// =============================================================================
// Command Router (for generic command handling)
// =============================================================================

/**
 * Execute a zenc command.
 * Routes to the appropriate function based on command type.
 */
export const sendCommand = (
	command: ZencCommand,
): Effect.Effect<
	KeypairResult | EncryptResult | DecryptResult,
	ZencServiceError
> =>
	Effect.gen(function* () {
		switch (command.command) {
			case "keygen":
				return yield* generateKeypair;

			case "encrypt":
				return yield* encryptFile(command.filePath, {
					toPublicKey: command.toPublicKey,
					password: command.password,
				});

			case "decrypt":
				return yield* decryptFile(command.filePath, {
					secretKey: command.secretKey,
					password: command.password,
				});
		}
	});
