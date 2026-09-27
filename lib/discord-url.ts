export function discordAuthorizeUrl() {
  const redirect = `${process.env.APP_URL}/api/auth/callback`;
  return `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    redirect,
  )}&scope=identify`;
}
