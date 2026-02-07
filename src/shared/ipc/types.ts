// IPC Event types for communication with zend/zenc
// Field names match the actual JSON output from the Zig binaries (snake_case)

// =============================================================================
// Zenc Events (Encryption Engine)
// =============================================================================

export type ZencKeygenEvent = {
	event: "keygen";
	public_key: string;
	secret_key: string;
};

export type ZencStartEvent = {
	event: "start";
	file: string;
	size: number;
};

export type ZencProgressEvent = {
	event: "progress";
	bytes: number;
	percent: number;
};

export type ZencDoneEvent = {
	event: "done";
	output: string;
	hash: string;
};

export type ZencErrorEvent = {
	event: "error";
	code: string;
	message: string;
};

export type ZencEvent =
	| ZencKeygenEvent
	| ZencStartEvent
	| ZencProgressEvent
	| ZencDoneEvent
	| ZencErrorEvent;

// =============================================================================
// Zend Events (P2P Transport Engine)
// =============================================================================

// Identity events
export type ZendIdentityCreatedEvent = {
	event: "identity_created";
	public_key: string;
	fingerprint: string;
};

export type ZendIdentityLoadedEvent = {
	event: "identity_loaded";
	public_key: string;
	fingerprint: string;
};

export type ZendIdentityEvent =
	| ZendIdentityCreatedEvent
	| ZendIdentityLoadedEvent;

// Peer events
export type ZendPeerAddedEvent = {
	event: "peer_added";
	name: string;
	fingerprint: string;
};

export type ZendPeerRemovedEvent = {
	event: "peer_removed";
	name: string;
};

export type ZendPeerTrustUpdatedEvent = {
	event: "peer_trust_updated";
	name: string;
	trust: "trusted" | "blocked" | "untrusted";
};

export type ZendPeerListEvent = {
	event: "peer_list";
	peers: Array<{
		name: string;
		public_key: string;
		address: string;
		fingerprint: string;
		trust: "trusted" | "blocked" | "untrusted";
	}>;
};

export type ZendPeerEvent =
	| ZendPeerAddedEvent
	| ZendPeerRemovedEvent
	| ZendPeerTrustUpdatedEvent
	| ZendPeerListEvent;

// Connection events
export type ZendConnectingEvent = {
	event: "connecting";
	peer: string;
	address: string;
};

export type ZendListeningEvent = {
	event: "listening";
	port: number;
};

export type ZendHandshakeCompleteEvent = {
	event: "handshake_complete";
	peer: string;
};

export type ZendConnectionEvent =
	| ZendConnectingEvent
	| ZendListeningEvent
	| ZendHandshakeCompleteEvent;

// Transfer events
export type ZendTransferStartEvent = {
	event: "transfer_start";
	file: string;
	size: number;
	peer: string;
};

export type ZendProgressEvent = {
	event: "progress";
	bytes: number;
	percent: number;
};

export type ZendTransferCompleteEvent = {
	event: "transfer_complete";
	file: string;
	hash: string;
};

export type ZendTransferEvent =
	| ZendTransferStartEvent
	| ZendProgressEvent
	| ZendTransferCompleteEvent;

// Error event
export type ZendErrorEvent = {
	event: "error";
	code: string;
	message: string;
};

// All zend events
export type ZendEvent =
	| ZendIdentityEvent
	| ZendPeerEvent
	| ZendConnectionEvent
	| ZendTransferEvent
	| ZendErrorEvent;

// =============================================================================
// Combined IPC Event (for generic event handling)
// =============================================================================

export type IpcEvent = ZencEvent | ZendEvent;

// =============================================================================
// Error types for Effect
// =============================================================================

export class BinaryNotFoundError {
	readonly _tag = "BinaryNotFoundError";
	constructor(
		readonly binary: string,
		readonly path: string,
	) {}
}

export class BinaryExecutionError {
	readonly _tag = "BinaryExecutionError";
	constructor(
		readonly binary: string,
		readonly code: string,
		readonly message: string,
	) {}
}

export class JsonParseError {
	readonly _tag = "JsonParseError";
	constructor(
		readonly binary: string,
		readonly line: string,
		readonly error: string,
	) {}
}
