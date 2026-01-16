import { createHash } from "node:crypto";

const ED25519_PUBLIC_KEY_BYTES = 32;

export type ParsedPublicKey = {
	normalized: string;
	fingerprint: string;
};

export function parseEd25519PublicKey(
	publicKeyBase64: string,
): ParsedPublicKey | null {
	const normalized = publicKeyBase64.replace(/\s+/g, "");
	if (!normalized) return null;
	if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) return null;

	const decoded = Buffer.from(normalized, "base64");
	if (decoded.length !== ED25519_PUBLIC_KEY_BYTES) return null;

	const fingerprint = createHash("sha256").update(decoded).digest("hex");
	return { normalized, fingerprint };
}
