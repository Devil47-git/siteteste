/**
 * Client REST pentru Discord (fara dependinte externe).
 */

const API = "https://discord.com/api/v10";

/** Campurile vin opțional de la API-ul Discord; le tratăm ca nullable. */
export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

function headers(token: string) {
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

async function call<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Discord ${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

export async function webhook(
  url: string,
  payload: { content: string; embeds?: unknown[]; components?: unknown[] },
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Webhook ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return res.json().catch(() => null);
}

/** Trimite un mesaj pe un webhook, daca este configurat. */
export async function postWebhook(envVar: string, content: string, embeds: unknown[] = []) {
  const url = process.env[envVar];
  if (!url) return null;
  return webhook(url, embeds.length ? { content, embeds } : { content });
}

export async function postMessage(
  channel: string,
  content: string,
  components: unknown[] = [],
  token = process.env.DISCORD_BOT_TOKEN!,
): Promise<{ id: string }> {
  return call<{ id: string }>("POST", `/channels/${channel}/messages`, token, { content, components });
}

export async function editMessage(
  channel: string,
  message: string,
  content: string,
  components: unknown[] = [],
  token = process.env.DISCORD_BOT_TOKEN!,
) {
  return call("PATCH", `/channels/${channel}/messages/${message}`, token, { content, components });
}

export async function dmMessage(userId: string, content: string, components: unknown[] = []) {
  return call("POST", `/users/@me/channels`, process.env.DISCORD_BOT_TOKEN!, {
    recipient_id: userId,
  }).then((ch: any) => postMessage(ch.id, content, components));
}

export async function getGuildMember(guildId: string, userId: string) {
  return call<any>("GET", `/guilds/${guildId}/members/${userId}`, process.env.DISCORD_BOT_TOKEN!);
}

export function avatarUrl(user: { id: string; avatar?: string | null }) {
  return user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(user.id) >> 22 % 6}.png`;
}

export function button(customId: string, label: string, style = 2, disabled = false) {
  return {
    type: 2,
    style,
    label,
    custom_id: customId,
    disabled,
  };
}

export function container(buttons: unknown[]) {
  return [{ type: 1, components: buttons }];
}
