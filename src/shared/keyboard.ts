const SHIFTED_KEYS: Record<string, string> = {
	"1": "!",
	"2": "@",
	"3": "#",
	"4": "$",
	"5": "%",
	"6": "^",
	"7": "&",
	"8": "*",
	"9": "(",
	"0": ")",
	"-": "_",
	"=": "+",
	"[": "{",
	"]": "}",
	"\\": "|",
	";": ":",
	"'": '"',
	",": "<",
	".": ">",
	"/": "?",
	"`": "~",
};

export type InputKey = {
	name?: string;
	shift?: boolean;
};

export function getPrintableKey(key: InputKey): string | null {
	if (!key.name) return null;
	if (key.name === "space") return " ";
	if (key.name.length !== 1) return null;

	if (!key.shift) return key.name;

	if (/[a-z]/.test(key.name)) {
		return key.name.toUpperCase();
	}

	return SHIFTED_KEYS[key.name] ?? key.name;
}
