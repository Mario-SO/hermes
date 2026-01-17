import { useModalState } from "@features/overlays/modalState";
import { AddPeerModal } from "./AddPeerModal";
import { ConfirmSendModal } from "./ConfirmSendModal";
import { DecryptFileModal } from "./DecryptFileModal";
import { EncryptionOptionsModal } from "./EncryptionOptionsModal";
import { ErrorModal } from "./ErrorModal";
import { ReceiveRequestModal } from "./ReceiveRequestModal";
import { SaveLocationModal } from "./SaveLocationModal";
import { SelectFileModal } from "./SelectFileModal";
import { TrustPeerModal } from "./TrustPeerModal";

export function ModalHost() {
	const modalState = useModalState();

	switch (modalState.type) {
		case "add_peer":
			return <AddPeerModal />;
		case "trust_peer":
			return <TrustPeerModal />;
		case "select_file":
			return <SelectFileModal />;
		case "encryption_options":
			return <EncryptionOptionsModal />;
		case "confirm_send":
			return <ConfirmSendModal />;
		case "decrypt_file":
			return <DecryptFileModal />;
		case "receive_request":
			return <ReceiveRequestModal />;
		case "save_location":
			return <SaveLocationModal />;
		case "error":
			return <ErrorModal />;
		default:
			return null;
	}
}
