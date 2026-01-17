import { Effect } from "effect";

const getClipboardWriteCommands = (): Array<{
	cmd: string;
	args: string[];
}> => {
	switch (process.platform) {
		case "darwin":
			return [{ cmd: "pbcopy", args: [] }];
		case "win32":
			return [{ cmd: "clip", args: [] }];
		default:
			return [
				{ cmd: "wl-copy", args: [] },
				{ cmd: "xclip", args: ["-selection", "clipboard"] },
			];
	}
};

const getClipboardReadCommands = (): Array<{ cmd: string; args: string[] }> => {
	switch (process.platform) {
		case "darwin":
			return [{ cmd: "pbpaste", args: [] }];
		case "win32":
			return [{ cmd: "powershell", args: ["-command", "Get-Clipboard"] }];
		default:
			return [
				{ cmd: "wl-paste", args: [] },
				{ cmd: "xclip", args: ["-selection", "clipboard", "-o"] },
			];
	}
};

export const writeToClipboard = (text: string) =>
	Effect.tryPromise({
		try: async () => {
			const commands = getClipboardWriteCommands();
			let lastError: Error | null = null;

			for (const { cmd, args } of commands) {
				try {
					const proc = Bun.spawn({
						cmd: [cmd, ...args],
						stdin: "pipe",
						stdout: "ignore",
						stderr: "pipe",
					});

					if (proc.stdin) {
						proc.stdin.write(text);
						proc.stdin.end();
					}

					const exitCode = await proc.exited;
					if (exitCode === 0) {
						return;
					}

					const stderr = await new Response(proc.stderr).text();
					throw new Error(stderr.trim() || `Clipboard command failed: ${cmd}`);
				} catch (error) {
					lastError = error instanceof Error ? error : new Error(String(error));
				}
			}

			throw (
				lastError ?? new Error("No clipboard command available on this system.")
			);
		},
		catch: (error) =>
			error instanceof Error ? error : new Error(String(error)),
	});

export const readFromClipboard = Effect.tryPromise({
	try: async () => {
		const commands = getClipboardReadCommands();
		let lastError: Error | null = null;

		for (const { cmd, args } of commands) {
			try {
				const proc = Bun.spawn({
					cmd: [cmd, ...args],
					stdin: "ignore",
					stdout: "pipe",
					stderr: "pipe",
				});

				const exitCode = await proc.exited;
				if (exitCode === 0) {
					const text = await new Response(proc.stdout).text();
					return text;
				}

				const stderr = await new Response(proc.stderr).text();
				throw new Error(stderr.trim() || `Clipboard command failed: ${cmd}`);
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
			}
		}

		throw (
			lastError ?? new Error("No clipboard command available on this system.")
		);
	},
	catch: (error) => (error instanceof Error ? error : new Error(String(error))),
});
