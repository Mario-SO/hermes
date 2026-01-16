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

// Receive events (incoming file requests)
export type ZendIncomingRequestEvent = {
	event: "incoming_request";
	request_id: string;
	peer: string;
	peer_fingerprint: string;
	file: string;
	size: number;
};

export type ZendReceiveStartEvent = {
	event: "receive_start";
	transfer_id: string;
};

export type ZendReceiveCompleteEvent = {
	event: "receive_complete";
	file: string;
	hash: string;
	save_path: string;
};

export type ZendReceiveEvent =
	| ZendIncomingRequestEvent
	| ZendReceiveStartEvent
	| ZendReceiveCompleteEvent;

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
	| ZendReceiveEvent
	| ZendErrorEvent;

// =============================================================================
// Combined IPC Event (for generic event handling)
// =============================================================================

export type IpcEvent = ZencEvent | ZendEvent;

// =============================================================================
// Command types (for routing in the services - not sent to binaries directly)
// =============================================================================

export type ZendCommand =
	| { command: "id_init" }
	| { command: "id_show" }
	| { command: "peer_add"; name: string; publicKey: string; address: string }
	| { command: "peer_remove"; name: string }
	| { command: "peer_trust"; name: string; trust: "trusted" | "blocked" }
	| { command: "peer_list" }
	| { command: "send"; filePath: string; peerName: string }
	| { command: "receive_start"; port?: number }
	| { command: "receive_stop" };

export type ZencCommand =
	| { command: "keygen" }
	| {
			command: "encrypt";
			filePath: string;
			toPublicKey?: string;
			password?: string;
	  }
	| {
			command: "decrypt";
			filePath: string;
			secretKey?: string;
			password?: string;
	  };

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
