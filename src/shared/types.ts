// Navigation
export type SectionId =
	| "identity"
	| "peers"
	| "transfers"
	| "receive"
	| "files";

// Pane Focus
export type FocusedPane = "navigation" | "main" | "inspect";

// Identity
export type Identity = {
	publicKey: string;
	fingerprint: string;
	createdAt: Date;
};

// Peers
export type PeerTrustLevel = "trusted" | "pending" | "blocked";

export type Peer = {
	id: string;
	address: string;
	publicKey: string;
	fingerprint: string;
	label?: string;
	trustLevel: PeerTrustLevel;
	lastSeen?: Date;
};

// Transfers
export type TransferDirection = "send" | "receive";
export type TransferStatus =
	| "pending"
	| "in_progress"
	| "completed"
	| "failed"
	| "cancelled";

export type Transfer = {
	id: string;
	direction: TransferDirection;
	peerId: string;
	fileName: string;
	fileSize: number;
	progress: number;
	status: TransferStatus;
	hash?: string;
	startedAt: Date;
	completedAt?: Date;
	error?: string;
};

// Receive
export type IncomingRequest = {
	id: string;
	peerId: string;
	peerFingerprint: string;
	fileName: string;
	fileSize: number;
	receivedAt: Date;
};

export type ReceiveStatus = "idle" | "listening" | "receiving";

// Modal
export type ModalType =
	| "none"
	| "add_peer"
	| "trust_peer"
	| "select_file"
	| "encryption_options"
	| "confirm_send"
	| "receive_request"
	| "save_location"
	| "error";

export type ModalState = {
	type: ModalType;
	data?: unknown;
};
