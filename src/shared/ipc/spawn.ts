/**
 * Binary spawn helper for zenc/zend IPC
 *
 * Provides utilities to spawn the embedded binaries and parse
 * line-delimited JSON from their stdout.
 */

import { dirname, join } from "node:path";
import { type Subprocess, spawn } from "bun";
import { Effect, Stream } from "effect";
import {
	BinaryExecutionError,
	BinaryNotFoundError,
	JsonParseError,
} from "./types";

// =============================================================================
// Binary Path Resolution
// =============================================================================

/**
 * Get the path to the hermes bin directory where embedded binaries live.
 * This resolves relative to the hermes package root.
 */
const getHermesBinDir = (): string => {
	// In production, binaries are in hermes/bin relative to the package
	// import.meta.dir gives us the directory of this file
	// We need to go up from src/shared/ipc to hermes root, then into bin
	const ipcDir = import.meta.dir;
	const hermesRoot = dirname(dirname(dirname(ipcDir))); // up 3 levels: ipc -> shared -> src -> hermes
	return join(hermesRoot, "bin");
};

/**
 * Get the full path to a binary (zenc or zend)
 */
export const getBinaryPath = (binary: "zenc" | "zend"): string => {
	const binDir = getHermesBinDir();
	return join(binDir, binary);
};

// =============================================================================
// One-Shot Execution (spawn, run to completion, parse output)
// =============================================================================

export interface SpawnOptions {
	/** The binary to run */
	binary: "zenc" | "zend";
	/** Command-line arguments */
	args: string[];
	/** Optional data to write to stdin */
	stdin?: string;
	/** Optional timeout in milliseconds */
	timeout?: number;
}

export interface SpawnResult<T> {
	/** All parsed JSON events from stdout */
	events: T[];
	/** Exit code of the process */
	exitCode: number;
}

/**
 * Spawn a binary, wait for it to complete, and parse all JSON output.
 * Returns an Effect that yields the parsed events.
 */
export const spawnAndCollect = <T>(
	options: SpawnOptions,
): Effect.Effect<
	SpawnResult<T>,
	BinaryNotFoundError | BinaryExecutionError | JsonParseError
> =>
	Effect.gen(function* () {
		const binaryPath = getBinaryPath(options.binary);

		// Check if binary exists
		const file = Bun.file(binaryPath);
		const exists = yield* Effect.tryPromise({
			try: () => file.exists(),
			catch: () => new BinaryNotFoundError(options.binary, binaryPath),
		});

		if (!exists) {
			return yield* Effect.fail(
				new BinaryNotFoundError(options.binary, binaryPath),
			);
		}

		// Spawn the process
		const proc = spawn({
			cmd: [binaryPath, ...options.args],
			stdin: options.stdin !== undefined ? "pipe" : "ignore",
			stdout: "pipe",
			stderr: "pipe",
		});

		// Write to stdin if provided
		if (options.stdin !== undefined && proc.stdin) {
			proc.stdin.write(options.stdin);
			proc.stdin.end();
		}

		// Read stdout and stderr
		const [stdoutText, stderrText, exitCode] = yield* Effect.tryPromise({
			try: async () => {
				const stdout = await new Response(proc.stdout).text();
				const stderr = await new Response(proc.stderr).text();
				const code = await proc.exited;
				return [stdout, stderr, code] as const;
			},
			catch: (error) =>
				new BinaryExecutionError(
					options.binary,
					"spawn_error",
					error instanceof Error ? error.message : String(error),
				),
		});

		// Parse JSON from stdout (NDJSON or single multi-line JSON object)
		const events: T[] = [];
		const lines = stdoutText.split("\n").filter((line) => line.trim());
		let lineParseFailed = false;
		let failedLine = "";

		for (const line of lines) {
			try {
				const parsed = JSON.parse(line) as T;
				events.push(parsed);
			} catch {
				lineParseFailed = true;
				failedLine = line;
				break;
			}
		}

		if (lineParseFailed) {
			const trimmed = stdoutText.trim();
			if (trimmed) {
				try {
					const parsed = JSON.parse(trimmed) as T | T[];
					if (Array.isArray(parsed)) {
						events.push(...parsed);
					} else {
						events.push(parsed);
					}
				} catch (error) {
					return yield* Effect.fail(
						new JsonParseError(
							options.binary,
							failedLine || trimmed,
							error instanceof Error ? error.message : String(error),
						),
					);
				}
			}
		}

		// Check for error events in stderr (if JSON) or return error on non-zero exit
		if (exitCode !== 0) {
			const stdoutError = events.find((event) => {
				const candidate = event as {
					event?: string;
					code?: string;
					message?: string;
				};
				return candidate.event === "error";
			});
			if (stdoutError) {
				const candidate = stdoutError as {
					code?: string;
					message?: string;
				};
				return yield* Effect.fail(
					new BinaryExecutionError(
						options.binary,
						candidate.code ?? "unknown",
						candidate.message ?? "Unknown error",
					),
				);
			}

			// Try to parse stderr as JSON error
			const stderrLines = stderrText.split("\n").filter((line) => line.trim());
			for (const line of stderrLines) {
				try {
					const parsed = JSON.parse(line) as {
						event?: string;
						code?: string;
						message?: string;
					};
					if (parsed.event === "error") {
						return yield* Effect.fail(
							new BinaryExecutionError(
								options.binary,
								parsed.code ?? "unknown",
								parsed.message ?? "Unknown error",
							),
						);
					}
				} catch {
					// Not JSON, ignore
				}
			}
			// Generic error for non-zero exit
			return yield* Effect.fail(
				new BinaryExecutionError(
					options.binary,
					`exit_${exitCode}`,
					stderrText.trim() || `Process exited with code ${exitCode}`,
				),
			);
		}

		return { events, exitCode };
	});

/**
 * Spawn a binary and return the first event of a specific type.
 * Useful for commands that emit a single result event.
 */
export const spawnAndGetFirst = <T, R extends T>(
	options: SpawnOptions,
	eventType: string,
): Effect.Effect<
	R,
	BinaryNotFoundError | BinaryExecutionError | JsonParseError
> =>
	Effect.gen(function* () {
		const result = yield* spawnAndCollect<T & { event: string }>(options);

		const event = result.events.find((e) => e.event === eventType);
		if (!event) {
			return yield* Effect.fail(
				new BinaryExecutionError(
					options.binary,
					"missing_event",
					`Expected event '${eventType}' not found in output`,
				),
			);
		}

		return event as unknown as R;
	});

/**
 * Spawn a binary and return the last "done" event.
 * Useful for encrypt/decrypt operations that emit progress then done.
 */
export const spawnAndGetDone = <T extends { event: string }>(
	options: SpawnOptions,
): Effect.Effect<
	T,
	BinaryNotFoundError | BinaryExecutionError | JsonParseError
> =>
	Effect.gen(function* () {
		const result = yield* spawnAndCollect<T>(options);

		// Find the last "done" event
		const doneEvent = result.events.findLast((e) => e.event === "done");
		if (!doneEvent) {
			// Check for error event
			const errorEvent = result.events.find((e) => e.event === "error") as
				| { event: "error"; code: string; message: string }
				| undefined;
			if (errorEvent) {
				return yield* Effect.fail(
					new BinaryExecutionError(
						options.binary,
						errorEvent.code,
						errorEvent.message,
					),
				);
			}
			return yield* Effect.fail(
				new BinaryExecutionError(
					options.binary,
					"missing_done",
					"Expected 'done' event not found in output",
				),
			);
		}

		return doneEvent;
	});

// =============================================================================
// Long-Running Process Management (for zend receive)
// =============================================================================

export interface ManagedProcess {
	/** The underlying Bun subprocess */
	process: Subprocess;
	/** Stream of parsed JSON events */
	events: Stream.Stream<unknown, JsonParseError>;
	/** Kill the process */
	kill: () => void;
}

/**
 * Spawn a long-running process and return a stream of JSON events.
 * Used for `zend receive` which runs until explicitly stopped.
 */
export const spawnLongRunning = (
	options: Omit<SpawnOptions, "stdin">,
): Effect.Effect<ManagedProcess, BinaryNotFoundError> =>
	Effect.gen(function* () {
		const binaryPath = getBinaryPath(options.binary);

		// Check if binary exists
		const file = Bun.file(binaryPath);
		const exists = yield* Effect.tryPromise({
			try: () => file.exists(),
			catch: () => new BinaryNotFoundError(options.binary, binaryPath),
		});

		if (!exists) {
			return yield* Effect.fail(
				new BinaryNotFoundError(options.binary, binaryPath),
			);
		}

		// Spawn the process
		const proc = spawn({
			cmd: [binaryPath, ...options.args],
			stdin: "ignore",
			stdout: "pipe",
			stderr: "pipe",
		});

		// Create a stream from stdout
		const events = Stream.asyncScoped<unknown, JsonParseError>((emit) =>
			Effect.gen(function* () {
				const reader = proc.stdout.getReader();
				const decoder = new TextDecoder();
				let buffer = "";

				const readLoop = async () => {
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) {
								emit.end();
								break;
							}

							buffer += decoder.decode(value, { stream: true });
							const lines = buffer.split("\n");
							buffer = lines.pop() ?? "";

							for (const line of lines) {
								if (line.trim()) {
									try {
										const parsed = JSON.parse(line);
										emit.single(parsed);
									} catch (error) {
										emit.fail(
											new JsonParseError(
												options.binary,
												line,
												error instanceof Error ? error.message : String(error),
											),
										);
										return;
									}
								}
							}
						}
					} catch (error) {
						emit.fail(
							new JsonParseError(
								options.binary,
								"",
								error instanceof Error ? error.message : String(error),
							),
						);
					}
				};

				// Start reading in the background
				readLoop();

				// Return cleanup function
				return Effect.sync(() => {
					reader.cancel();
				});
			}),
		);

		return {
			process: proc,
			events,
			kill: () => proc.kill(),
		};
	});
