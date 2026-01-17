/**
 * Zenc IPC Service - Encryption Engine Interface
 *
 * This service spawns the zenc binary and communicates via JSON over stdio.
 * All operations are one-shot: spawn binary, optionally write to stdin, parse output.
 */

import { Effect } from "effect";
import { spawnAndGetDone } from "./spawn";
import {
	BinaryExecutionError,
	type BinaryNotFoundError,
	type JsonParseError,
	type ZencDoneEvent,
} from "./types";

// =============================================================================
// Service Error Type
// =============================================================================

export type ZencServiceError =
	| BinaryNotFoundError
	| BinaryExecutionError
	| JsonParseError;

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
