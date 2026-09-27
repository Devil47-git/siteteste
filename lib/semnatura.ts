import nacl from "tweetnacl";

/** Verifica semnatura Ed25519 a request-ului de interactiuni Discord (PING + butoane). */
export async function verificaSemnatura(req: Request, body: string) {
  const pub = process.env.DISCORD_PUBLIC_KEY;
  if (!pub) throw new Error("DISCORD_PUBLIC_KEY lipseste");

  const sig = req.headers.get("x-signature-ed25519");
  const ts = req.headers.get("x-signature-timestamp");
  if (!sig || !ts) return false;

  try {
    return nacl.sign.detached.verify(
      Buffer.from(sig, "hex"),
      Buffer.from(ts + body),
      Buffer.from(pub, "hex"),
    );
  } catch {
    return false;
  }
}
