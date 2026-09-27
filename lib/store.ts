/**
 * Store: Redis prin REST (Upstash) - functioneaza fara server si fara dependinte.
 * Daca nu sunt setate env vars, se foloseste un Map in memorie (doar pentru dev local).
 */

type Store = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, exSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
};

const mem = new Map<string, { v: string; exp: number }>();

const memoryStore: Store = {
  async get(key) {
    const e = mem.get(key);
    if (!e) return null;
    if (Date.now() > e.exp) {
      mem.delete(key);
      return null;
    }
    return e.v;
  },
  async set(key, value, exSeconds) {
    mem.set(key, { v: value, exp: Date.now() + (exSeconds ?? 86400) * 1000 });
  },
  async del(key) {
    mem.delete(key);
  },
};

function redisStore(): Store | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const cmd = async (args: (string | number)[]) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Redis error ${res.status}`);
    const json = (await res.json()) as { error?: string; result?: string | number | null };
    if (json.error) throw new Error(`Redis: ${json.error}`);
    return json.result;
  };

  return {
    async get(key) {
      const r = await cmd(["GET", key]);
      return r === null || r === undefined ? null : String(r);
    },
    async set(key, value, exSeconds) {
      if (exSeconds) await cmd(["SET", key, value, "EX", exSeconds]);
      else await cmd(["SET", key, value]);
    },
    async del(key) {
      await cmd(["DEL", key]);
    },
  };
}

let instance: Store | null = null;

export function store(): Store {
  if (!instance) instance = redisStore() ?? memoryStore;
  return instance;
}

export { store as rawStore };

export const STORE_ESTE_REDIS = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

/** Chei */
export const K = {
  user: (id: string) => `u:${id}`, // user:discordId
  cod: (id: string) => `c:${id}`, // cod:id
  codDeUser: (userId: string) => `cu:${userId}`, // cod:ultimul cerut de user
  attempt: (id: string) => `a:${id}`, // attempt:id
  attemptDeUser: (userId: string, testId: string) => `au:${userId}:${testId}`,
};

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await store().get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown, exSeconds?: number) {
  await store().set(key, JSON.stringify(value), exSeconds);
}
