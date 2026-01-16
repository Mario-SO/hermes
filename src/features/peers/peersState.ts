import { zend } from "@shared/ipc";
import type { PeerInfo } from "@shared/ipc/zendService";
import {
	createSubscriptionRef,
	getSubscriptionValue,
	useSubscriptionValue,
} from "@shared/store";
import type { Peer } from "@shared/types";
import { Effect, SubscriptionRef } from "effect";

export type PeersState = {
	peers: Peer[];
	selectedPeerId: string | null;
	isLoading: boolean;
	error: string | null;
};

const initialState: PeersState = {
	peers: [],
	selectedPeerId: null,
	isLoading: false,
	error: null,
};

export const peersStateRef = createSubscriptionRef(initialState);

export function usePeersState(): PeersState {
	return useSubscriptionValue(peersStateRef);
}

export function getPeersState(): PeersState {
	return getSubscriptionValue(peersStateRef);
}

export const setPeersLoading = (isLoading: boolean) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(peersStateRef, (state) => ({
			...state,
			isLoading,
			error: null,
		}));
	});

export const setPeers = (peers: Peer[]) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(peersStateRef, (state) => ({
			...state,
			peers,
			selectedPeerId: peers.some((peer) => peer.id === state.selectedPeerId)
				? state.selectedPeerId
				: (peers[0]?.id ?? null),
			isLoading: false,
			error: null,
		}));
	});

export const addPeer = (peer: Peer) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(peersStateRef, (state) => ({
			...state,
			peers: [...state.peers, peer],
		}));
	});

export const updatePeer = (peerId: string, updates: Partial<Peer>) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(peersStateRef, (state) => ({
			...state,
			peers: state.peers.map((p) =>
				p.id === peerId ? { ...p, ...updates } : p,
			),
		}));
	});

export const removePeer = (peerId: string) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(peersStateRef, (state) => ({
			...state,
			peers: state.peers.filter((p) => p.id !== peerId),
			selectedPeerId:
				state.selectedPeerId === peerId ? null : state.selectedPeerId,
		}));
	});

export const selectPeer = (peerId: string | null) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(peersStateRef, (state) => ({
			...state,
			selectedPeerId: peerId,
		}));
	});

export const selectNextPeer = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(peersStateRef);
	if (state.peers.length === 0) return;

	const currentIndex = state.peers.findIndex(
		(p) => p.id === state.selectedPeerId,
	);
	const nextIndex = (currentIndex + 1) % state.peers.length;
	const nextPeer = state.peers[nextIndex];

	if (nextPeer) {
		yield* SubscriptionRef.set(peersStateRef, {
			...state,
			selectedPeerId: nextPeer.id,
		});
	}
});

export const selectPrevPeer = Effect.gen(function* () {
	const state = yield* SubscriptionRef.get(peersStateRef);
	if (state.peers.length === 0) return;

	const currentIndex = state.peers.findIndex(
		(p) => p.id === state.selectedPeerId,
	);
	const prevIndex =
		currentIndex <= 0 ? state.peers.length - 1 : currentIndex - 1;
	const prevPeer = state.peers[prevIndex];

	if (prevPeer) {
		yield* SubscriptionRef.set(peersStateRef, {
			...state,
			selectedPeerId: prevPeer.id,
		});
	}
});

export const setPeersError = (error: string) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(peersStateRef, (state) => ({
			...state,
			isLoading: false,
			error,
		}));
	});

export function getSelectedPeer(): Peer | undefined {
	const state = getPeersState();
	return state.peers.find((p) => p.id === state.selectedPeerId);
}

const formatPeersError = (error: unknown): string =>
	error instanceof Error ? error.message : JSON.stringify(error);

const mapZendPeer = (peer: PeerInfo): Peer => ({
	id: peer.name,
	address: peer.address,
	publicKey: peer.publicKey,
	fingerprint: peer.fingerprint,
	label: peer.name,
	trustLevel: peer.trust === "blocked" ? "blocked" : "trusted",
});

const refreshPeersFromZend = Effect.gen(function* () {
	const peers = yield* zend.listPeers;
	yield* setPeers(peers.map(mapZendPeer));
});

export const loadPeersFromZend = Effect.gen(function* () {
	yield* setPeersLoading(true);

	yield* refreshPeersFromZend.pipe(
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				yield* setPeersError(formatPeersError(error));
			}),
		),
	);
});

export const addPeerWithZend = (
	name: string,
	publicKey: string,
	address: string,
) =>
	Effect.gen(function* () {
		yield* setPeersLoading(true);

		const result = yield* zend.addPeer(name, publicKey, address).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* setPeersError(formatPeersError(error));
					return null;
				}),
			),
		);

		if (!result) return null;

		yield* refreshPeersFromZend.pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* setPeersError(formatPeersError(error));
				}),
			),
		);

		return result;
	});

export const removePeerWithZend = (name: string) =>
	Effect.gen(function* () {
		yield* setPeersLoading(true);

		const result = yield* zend.removePeer(name).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* setPeersError(formatPeersError(error));
					return null;
				}),
			),
		);

		if (!result) return null;

		yield* refreshPeersFromZend.pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* setPeersError(formatPeersError(error));
				}),
			),
		);

		return result;
	});

export const trustPeerWithZend = (peer: Peer) =>
	addPeerWithZend(peer.id, peer.publicKey, peer.address);

export const setPeerTrustWithZend = (
	name: string,
	trust: "trusted" | "blocked",
) =>
	Effect.gen(function* () {
		yield* setPeersLoading(true);

		const result = yield* zend.setPeerTrust(name, trust).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* setPeersError(formatPeersError(error));
					return null;
				}),
			),
		);

		if (!result) return null;

		yield* refreshPeersFromZend.pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* setPeersError(formatPeersError(error));
				}),
			),
		);

		return result;
	});
