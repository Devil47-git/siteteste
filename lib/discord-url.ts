export function discordAuthorizeUrl() {
  const base = (process.env.APP_URL ?? "").trim().replace(/\/+$/, "");
  const redirect = `${base}/api/auth/callback`;
  return `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    redirect,
  )}&scope=identify`;
}
