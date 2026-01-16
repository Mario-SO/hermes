import { openModal, openTrustPeerModal } from "@features/overlays/modalState";
import { showToast } from "@features/overlays/toastState";
import {
	getPeersState,
	getSelectedPeer,
	removePeerWithZend,
	selectNextPeer,
	selectPrevPeer,
	setPeerTrustWithZend,
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
					const result = yield* setPeerTrustWithZend(peer.id, "blocked");
					if (!result) {
						yield* showToast({
							message: "Failed to update trust.",
							tone: "error",
						});
						return;
					}
					yield* showToast({
						message: "Peer marked untrusted.",
						tone: "warning",
					});
					return;
				}
				if (peer.trustLevel === "blocked") {
					const result = yield* setPeerTrustWithZend(peer.id, "trusted");
					if (!result) {
						yield* showToast({
							message: "Failed to update trust.",
							tone: "error",
						});
						return;
					}
					yield* showToast({
						message: "Peer marked trusted.",
						tone: "success",
					});
					return;
				}
				yield* openTrustPeerModal(peer);
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
				yield* removePeerWithZend(peer.id);
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
