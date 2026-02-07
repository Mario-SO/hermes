/**
 * Zend IPC Service - P2P Transport Engine Interface
 *
 * This service spawns the zend binary and communicates via JSON over stdio.
 * Most operations are one-shot, but `receive` is a long-running process
 * that streams events until stopped.
 */

import { Effect, Stream } from "effect";
import {
	type ManagedProcess,
	spawnAndCollect,
	spawnAndGetFirst,
	spawnLongRunning,
} from "./spawn";
import {
	BinaryExecutionError,
	type BinaryNotFoundError,
	type IpcEvent,
	type JsonParseError,
	type ZendEvent,
	type ZendIdentityCreatedEvent,
	type ZendIdentityLoadedEvent,
	type ZendPeerAddedEvent,
	type ZendPeerListEvent,
	type ZendPeerRemovedEvent,
	type ZendPeerTrustUpdatedEvent,
	type ZendTransferCompleteEvent,
} from "./types";

// =============================================================================
// Service Error Type
// =============================================================================

export type ZendServiceError =
	| BinaryNotFoundError
	| BinaryExecutionError
	| JsonParseError;

// =============================================================================
// Module State (for long-running receive process)
// =============================================================================

let receiveProcess: ManagedProcess | null = null;

// =============================================================================
// Identity Management
// =============================================================================

export interface IdentityResult {
	publicKey: string;
	fingerprint: string;
}

/**
 * Initialize a new identity using zend id init.
 * Creates a new Ed25519 keypair stored locally.
 */
export const initIdentity: Effect.Effect<IdentityResult, ZendServiceError> =
	Effect.gen(function* () {
		const event = yield* spawnAndGetFirst<ZendEvent, ZendIdentityCreatedEvent>(
			{
				binary: "zend",
				args: ["id", "init"],
			},
			"identity_created",
		);

		return {
			publicKey: event.public_key,
			fingerprint: event.fingerprint,
		} satisfies IdentityResult;
	});

/**
 * Show the current identity using zend id show.
 * Returns the existing identity if one exists.
 */
export const showIdentity: Effect.Effect<IdentityResult, ZendServiceError> =
	Effect.gen(function* () {
		// Try identity_loaded first, then identity_created (for backwards compat)
		const result = yield* spawnAndCollect<ZendEvent>({
			binary: "zend",
			args: ["id", "show"],
		});

		const loadedEvent = result.events.find(
			(e): e is ZendIdentityLoadedEvent => e.event === "identity_loaded",
		);

		if (loadedEvent) {
			return {
				publicKey: loadedEvent.public_key,
				fingerprint: loadedEvent.fingerprint,
			} satisfies IdentityResult;
		}

		const createdEvent = result.events.find(
			(e): e is ZendIdentityCreatedEvent => e.event === "identity_created",
		);

		if (createdEvent) {
			return {
				publicKey: createdEvent.public_key,
				fingerprint: createdEvent.fingerprint,
			} satisfies IdentityResult;
		}

		return yield* Effect.fail(
			new BinaryExecutionError(
				"zend",
				"no_identity",
				"No identity found. Run 'zend id init' first.",
			),
		);
	});

// =============================================================================
// Peer Management
// =============================================================================

export interface PeerInfo {
	name: string;
	publicKey: string;
	address: string;
	fingerprint: string;
	trust: "trusted" | "blocked";
}

export interface AddPeerResult {
	name: string;
	fingerprint: string;
}

/**
 * Add a trusted peer using zend peer add.
 *
 * @param name - Friendly name for the peer
 * @param publicKey - The peer's public key (base64)
 * @param address - The peer's address (host:port)
 */
export const addPeer = (
	name: string,
	publicKey: string,
	address: string,
): Effect.Effect<AddPeerResult, ZendServiceError> =>
	Effect.gen(function* () {
		const event = yield* spawnAndGetFirst<ZendEvent, ZendPeerAddedEvent>(
			{
				binary: "zend",
				args: ["peer", "add", name, publicKey, address],
			},
			"peer_added",
		);

		return {
			name: event.name,
			fingerprint: event.fingerprint,
		} satisfies AddPeerResult;
	});

/**
 * List all peers using zend peer list.
 */
export const listPeers: Effect.Effect<PeerInfo[], ZendServiceError> =
	Effect.gen(function* () {
		const event = yield* spawnAndGetFirst<ZendEvent, ZendPeerListEvent>(
			{
				binary: "zend",
				args: ["peer", "list"],
			},
			"peer_list",
		);

		return event.peers.map((p) => ({
			name: p.name,
			publicKey: p.public_key,
			address: p.address,
			fingerprint: p.fingerprint,
			trust:
				p.trust === "blocked" || p.trust === "untrusted"
					? "blocked"
					: "trusted",
		}));
	});

/**
 * Remove a trusted peer using zend peer remove.
 *
 * @param name - Name of the peer to remove
 */
export const removePeer = (
	name: string,
): Effect.Effect<{ name: string }, ZendServiceError> =>
	Effect.gen(function* () {
		const event = yield* spawnAndGetFirst<ZendEvent, ZendPeerRemovedEvent>(
			{
				binary: "zend",
				args: ["peer", "remove", name],
			},
			"peer_removed",
		);

		return { name: event.name };
	});

/**
 * Update a peer trust state using zend peer trust.
 *
 * @param name - Name of the peer to update
 * @param trust - trusted or blocked
 */
export const setPeerTrust = (
	name: string,
	trust: "trusted" | "blocked",
): Effect.Effect<
	{ name: string; trust: "trusted" | "blocked" },
	ZendServiceError
> =>
	Effect.gen(function* () {
		const event = yield* spawnAndGetFirst<ZendEvent, ZendPeerTrustUpdatedEvent>(
			{
				binary: "zend",
				args: ["peer", "trust", name, trust],
			},
			"peer_trust_updated",
		);

		return {
			name: event.name,
			trust:
				event.trust === "blocked" || event.trust === "untrusted"
					? "blocked"
					: "trusted",
		};
	});

// =============================================================================
// File Transfer (Send)
// =============================================================================

export interface SendResult {
	file: string;
	hash: string;
	peer: string;
}

/**
 * Send a file to a peer using zend send.
 *
 * @param filePath - Path to the file to send
 * @param peerName - Name of the peer to send to
 */
export const sendFile = (
	filePath: string,
	peerName: string,
): Effect.Effect<SendResult, ZendServiceError> =>
	Effect.gen(function* () {
		const result = yield* spawnAndCollect<ZendEvent>({
			binary: "zend",
			args: ["send", filePath, peerName],
			timeout: 600000, // 10 minute timeout for large files
		});

		const completeEvent = result.events.find(
			(e): e is ZendTransferCompleteEvent => e.event === "transfer_complete",
		);

		if (!completeEvent) {
			return yield* Effect.fail(
				new BinaryExecutionError(
					"zend",
					"transfer_incomplete",
					"File transfer did not complete successfully",
				),
			);
		}

		return {
			file: completeEvent.file,
			hash: completeEvent.hash,
			peer: peerName,
		} satisfies SendResult;
	});

/**
 * Send a file and collect all events including progress.
 * Useful for displaying progress in the UI.
 */
export const sendFileWithProgress = (
	filePath: string,
	peerName: string,
): Effect.Effect<
	{ events: ZendEvent[]; result: SendResult },
	ZendServiceError
> =>
	Effect.gen(function* () {
		const { events } = yield* spawnAndCollect<ZendEvent>({
			binary: "zend",
			args: ["send", filePath, peerName],
			timeout: 600000,
		});

		const completeEvent = events.find(
			(e): e is ZendTransferCompleteEvent => e.event === "transfer_complete",
		);

		if (!completeEvent) {
			return yield* Effect.fail(
				new BinaryExecutionError(
					"zend",
					"transfer_incomplete",
					"File transfer did not complete successfully",
				),
			);
		}

		return {
			events,
			result: {
				file: completeEvent.file,
				hash: completeEvent.hash,
				peer: peerName,
			},
		};
	});

// =============================================================================
// File Receiving (Long-Running Process)
// =============================================================================

export interface ReceiveStatus {
	status: "listening" | "idle";
	port?: number;
}

/**
 * Start receiving files using zend receive.
 * This spawns a long-running process that listens for incoming connections.
 *
 * @param port - Optional port to listen on (default: 7654)
 */
export const startReceiving = (
	port?: number,
	outputDir?: string,
): Effect.Effect<ReceiveStatus, ZendServiceError> =>
	Effect.gen(function* () {
		// If already receiving, stop first
		if (receiveProcess) {
			receiveProcess.kill();
			receiveProcess = null;
		}

		const args = ["receive"];
		if (port !== undefined) {
			args.push("--port", String(port));
		}
		if (outputDir && outputDir.trim().length > 0) {
			args.push("--output-dir", outputDir);
		}

		const managed = yield* spawnLongRunning({
			binary: "zend",
			args,
		});

		receiveProcess = managed;

		// Wait for the listening event to confirm we're ready
		// We'll peek at the first event to confirm listening started
		// For now, return immediately and assume listening will start
		return {
			status: "listening" as const,
			port: port ?? 7654,
		};
	});

/**
 * Stop receiving files.
 * Terminates the long-running receive process.
 */
export const stopReceiving: Effect.Effect<ReceiveStatus, never> = Effect.sync(
	() => {
		if (receiveProcess) {
			receiveProcess.kill();
			receiveProcess = null;
		}
		return { status: "idle" as const };
	},
);

/**
 * Create an event stream from the receive process.
 * Returns a stream of IPC events that can be processed by the UI.
 */
export const createEventStream = (): Stream.Stream<
	IpcEvent,
	JsonParseError
> => {
	if (!receiveProcess) {
		return Stream.empty;
	}
	return receiveProcess.events as Stream.Stream<IpcEvent, JsonParseError>;
};
