import { setModalCommandHandlers } from "@app/commands/context";
import { getActiveLayers } from "@app/commands/keymap";
import { commandById } from "@app/commands/registry";
import type { CommandContext, CommandLayerId } from "@app/commands/types";
import { useFocusState } from "@features/focus/focusState";
import { useIdentityState } from "@features/identity/identityState";
import { useNavigationState } from "@features/navigation/navigationState";
import { closeModal } from "@features/overlays/modalState";
import { useReceiveState } from "@features/receive/receiveState";
import { useTheme } from "@features/theme/themeState";
import { ModalFrame } from "@shared/components/ModalFrame";
import { useModalDimensions } from "@shared/hooks/useModalDimensions";
import { Effect } from "effect";
import { useCallback, useEffect, useMemo } from "react";

type HelpItem = {
	id: string;
	title: string;
	keys: string[];
	layers: Set<CommandLayerId>;
};

type HelpGroup = {
	title: string;
	items: HelpItem[];
};

type HelpRow =
	| { id: string; type: "header"; label: string }
	| { id: string; type: "item"; key: string; label: string }
	| { id: string; type: "ellipsis" };

const SECTION_LABELS: Record<string, string> = {
	identity: "Identity",
	peers: "Peers",
	activity: "Activity",
};

const PANE_LABELS: Record<string, string> = {
	navigation: "Navigation",
	main: "Main",
	inspect: "Inspect",
};

function clampMessage(message: string, maxLength: number): string {
	if (message.length <= maxLength) return message;
	if (maxLength <= 3) return message.slice(0, maxLength);
	return `${message.slice(0, maxLength - 3)}...`;
}

export function HelpModal() {
	const ui = useTheme().ui;
	const navigationState = useNavigationState();
	const focusState = useFocusState();
	const identityState = useIdentityState();
	const receiveState = useReceiveState();

	const { width, height } = useModalDimensions({
		minWidth: 52,
		widthPercent: 0.65,
		maxWidthPercent: 0.85,
		minHeight: 12,
		heightPercent: 0.55,
		maxHeightPercent: 0.75,
	});

	const handleClose = useCallback(() => {
		Effect.runSync(closeModal);
	}, []);

	useEffect(() => {
		setModalCommandHandlers({
			confirm: handleClose,
			cancel: handleClose,
			nextField: () => {},
			prevField: () => {},
		});
		return () => setModalCommandHandlers(null);
	}, [handleClose]);

	const { rows, keyWidth } = useMemo(() => {
		const ctx: CommandContext = {
			modalType: "none",
			activeSection: navigationState.activeSection,
			focusedPane: focusState.focusedPane,
			isListening: receiveState.status !== "idle",
			hasIdentity: identityState.identity !== null,
			modal: null,
		};

		const activeLayers = getActiveLayers(ctx);
		const itemsById = new Map<string, HelpItem & { keySet: Set<string> }>();

		for (const layer of activeLayers) {
			for (const binding of layer.bindings) {
				const command = commandById.get(binding.commandId);
				if (!command) continue;
				if (command.when && !command.when(ctx)) continue;

				const existing = itemsById.get(command.id) ?? {
					id: command.id,
					title: command.title,
					keys: [],
					keySet: new Set<string>(),
					layers: new Set<CommandLayerId>(),
				};
				existing.keySet.add(binding.display);
				existing.layers.add(layer.id);
				itemsById.set(command.id, existing);
			}
		}

		const sectionLabel =
			SECTION_LABELS[navigationState.activeSection] ??
			navigationState.activeSection;
		const sectionLayer =
			`section:${navigationState.activeSection}` as CommandLayerId;

		const globalGroup: HelpGroup = { title: "Global", items: [] };
		const sectionGroup: HelpGroup = { title: sectionLabel, items: [] };
		const navigationGroup: HelpGroup = { title: "Navigation", items: [] };
		const focusGroup: HelpGroup = { title: "Focus", items: [] };
		const groups: HelpGroup[] = [
			globalGroup,
			sectionGroup,
			navigationGroup,
			focusGroup,
		];

		for (const item of itemsById.values()) {
			item.keys = Array.from(item.keySet).sort((a, b) => a.localeCompare(b));
			const isSection = item.layers.has(sectionLayer);
			let group: HelpGroup = globalGroup;
			if (isSection) {
				group = sectionGroup;
			} else if (item.id.startsWith("nav.")) {
				group = navigationGroup;
			} else if (item.id.startsWith("focus.")) {
				group = focusGroup;
			}
			group.items.push(item);
		}

		for (const group of groups) {
			group.items.sort((a, b) => a.title.localeCompare(b.title));
		}

		const rows: HelpRow[] = [];
		for (const group of groups) {
			if (group.items.length === 0) continue;
			rows.push({
				id: `header:${group.title}`,
				type: "header",
				label: group.title,
			});
			for (const item of group.items) {
				rows.push({
					id: `item:${item.id}`,
					type: "item",
					key: item.keys.join(" / "),
					label: item.title,
				});
			}
		}

		if (rows.length === 0) {
			rows.push({
				id: "item:no-shortcuts",
				type: "item",
				key: "",
				label: "No shortcuts available.",
			});
		}

		const keyWidth = rows.reduce((max, row) => {
			if (row.type !== "item") return max;
			return Math.max(max, row.key.length);
		}, 0);

		return { rows, keyWidth };
	}, [
		navigationState.activeSection,
		focusState.focusedPane,
		identityState.identity,
		receiveState.status,
	]);

	const paneLabel =
		PANE_LABELS[focusState.focusedPane] ?? focusState.focusedPane;
	const sectionLabel =
		SECTION_LABELS[navigationState.activeSection] ??
		navigationState.activeSection;
	const contextLabel = `${sectionLabel} / ${paneLabel}`;

	const contentWidth = Math.max(1, width - 4);
	const keyColumnWidth = Math.max(
		8,
		Math.min(keyWidth, Math.floor(contentWidth * 0.35)),
	);
	const listMax = Math.max(1, height - 7);

	let displayRows = rows.slice(0, listMax);
	if (rows.length > listMax && displayRows.length > 0) {
		displayRows = displayRows.slice(0, listMax);
		displayRows[displayRows.length - 1] = {
			id: "ellipsis:truncated",
			type: "ellipsis",
		};
	}

	return (
		<ModalFrame width={width} height={height} title="Help">
			<text fg={ui.foregroundDim}>Active shortcuts — {contextLabel}</text>
			<box style={{ height: 1 }} />

			<box style={{ flexDirection: "column", flexGrow: 1 }}>
				{displayRows.map((row) => {
					if (row.type === "header") {
						return (
							<text key={row.id} fg={ui.accent}>
								{row.label}
							</text>
						);
					}
					if (row.type === "ellipsis") {
						return (
							<text key={row.id} fg={ui.foregroundDim}>
								...
							</text>
						);
					}

					const keyLabel = clampMessage(row.key, keyColumnWidth);
					const paddedKey = keyLabel.padEnd(keyColumnWidth + 1);
					const actionWidth = Math.max(1, contentWidth - keyColumnWidth - 1);
					const actionLabel = clampMessage(row.label, actionWidth);

					return (
						<box key={row.id} style={{ flexDirection: "row" }}>
							<text fg={ui.foregroundDim}>{paddedKey}</text>
							<text fg={ui.foreground}>{actionLabel}</text>
						</box>
					);
				})}
			</box>

			<box style={{ flexDirection: "row" }}>
				<text fg={ui.foregroundDim}>Enter/Esc</text>
				<text fg={ui.foreground}> Close</text>
			</box>
		</ModalFrame>
	);
}
