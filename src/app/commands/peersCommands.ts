import { openModal, openTrustPeerModal } from "@features/overlays/modalState";
import {
	getPeersState,
	getSelectedPeer,
	removePeer,
	selectNextPeer,
	selectPrevPeer,
	updatePeer,
} from "@features/peers/peersState";
import { Effect } from "effect";
import type { CommandDefinition } from "./types";

export const peersCommands = [
	{
		id: "peers.selectNext",
		title: "Select Next",
		keys: ["j", "down"],
		layers: ["section:peers"],
		when: (ctx) =>
			ctx.activeSection === "peers" &&
			ctx.focusedPane === "main" &&
			getPeersState().peers.length > 0,
		run: () => selectNextPeer,
	},
	{
		id: "peers.selectPrev",
		title: "Select Previous",
		keys: ["k", "up"],
		layers: ["section:peers"],
		when: (ctx) =>
			ctx.activeSection === "peers" &&
			ctx.focusedPane === "main" &&
			getPeersState().peers.length > 0,
		run: () => selectPrevPeer,
	},
	{
		id: "peers.add",
		title: "Add Peer",
		keys: ["a"],
		layers: ["section:peers"],
		when: (ctx) => ctx.activeSection === "peers" && ctx.hasIdentity,
		run: () => openModal("add_peer"),
	},
	{
		id: "peers.trust",
		title: "Trust Peer",
		keys: ["t"],
		layers: ["section:peers"],
		when: (ctx) => ctx.activeSection === "peers",
		run: () =>
			Effect.gen(function* () {
				const peer = getSelectedPeer();
				if (!peer) return;
				if (peer.trustLevel === "trusted") {
					yield* updatePeer(peer.id, { trustLevel: "pending" });
				} else {
					yield* openTrustPeerModal(peer);
				}
			}),
	},
	{
		id: "peers.delete",
		title: "Delete Peer",
		keys: ["d", "delete", "backspace"],
		layers: ["section:peers"],
		when: (ctx) => ctx.activeSection === "peers",
		run: () =>
			Effect.gen(function* () {
				const peer = getSelectedPeer();
				if (!peer) return;
				yield* removePeer(peer.id);
			}),
	},
	{
		id: "peers.sendFile",
		title: "Send File to Peer",
		keys: ["s", "return"],
		layers: ["section:peers"],
		when: (ctx) => ctx.activeSection === "peers",
		run: () =>
			Effect.gen(function* () {
				const peer = getSelectedPeer();
				if (!peer || peer.trustLevel !== "trusted") return;
				yield* openModal("select_file", peer);
			}),
	},
] as const satisfies readonly CommandDefinition[];
