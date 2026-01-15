import { renderer, setRoot } from "@app/renderer";
import { createRoot } from "@opentui/react";
import { App } from "./App";

const root = createRoot(renderer);
setRoot(root);

root.render(<App />);
