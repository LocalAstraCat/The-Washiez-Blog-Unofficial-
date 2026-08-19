import { mkdir, writeFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";

const keys = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const publicKey = await webcrypto.subtle.exportKey("jwk", keys.publicKey);
const privateKey = await webcrypto.subtle.exportKey("jwk", keys.privateKey);
const applicationServerKey = Buffer.from(await webcrypto.subtle.exportKey("raw", keys.publicKey)).toString("base64url");
const destination = new URL("../supabase/.local/chronicle-vapid.json", import.meta.url);

await mkdir(new URL("../supabase/.local/", import.meta.url), { recursive: true });
await writeFile(destination, `${JSON.stringify({ publicKey, privateKey, applicationServerKey }, null, 2)}\n`, { mode: 0o600 });
console.log(`VAPID key material written to ${destination.pathname}.`);
console.log(`Public application-server key: ${applicationServerKey}`);
