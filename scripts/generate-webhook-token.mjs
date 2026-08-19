import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const destination = new URL("../supabase/.local/chronicle-webhook-token.txt", import.meta.url);
await mkdir(new URL("../supabase/.local/", import.meta.url), { recursive: true });
await writeFile(destination, `${randomBytes(32).toString("base64url")}\n`, { mode: 0o600 });
console.log(`Webhook token written to ${destination.pathname}.`);
