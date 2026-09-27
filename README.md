# Platformă teste (Discord-auth)

Teste teoretice cu 4 variante: **S.M.U.L.S**, **Rezidentiat**, **B.L.S**, **Radio**.
Acces doar prin cont Discord. Fiecare test se deblchează cu un **cod** trimis de un membru HR
în privat pe Discord.

## Cum funcționează

1. Candidatul se loghează cu Discord (OAuth2).
2. Apasă **Solicită cod** la testul dorit.
3. Un mesaj apare în **canalul HR** cu butoane *Trimite codul în privat* / *Refuză*.
   (Mesajul se trimite prin **bot**, nu prin webhook — butoanele nu funcționează pe
   mesaje trimise prin webhook, pentru că interacțiunile nu ajung la aplicație.
   Webhook-ul e folosit doar ca rezervă, dacă botul nu poate vorbi în canal.)
4. Un membru HR apasă *Trimite codul în privat* → botul îi trimite codul candidatului prin DM.
5. Candidatul introduce codul pe site → dacă e valid și nefolosit, testul începe.
6. În test: contor **GREȘELI x/3** sus, **TIMP RĂMAS** sub el (roșu sub 30s).
   2 greșeli sunt admise; **a 3-a greșeală** oprește testul cu scor 0.

| Test | Timp | Întrebări | Greșeli |
|---|---|---|---|
| S.M.U.L.S | 3:00 | 15 | max 2 |
| Rezidentiat | 6:00 | 25 | max 2 |
| B.L.S | 3:00 | 12 | max 2 |
| Radio | 2:30 | 13 | max 2 |

La finalul fiecărui test se trimite automat un **raport** pe
`DISCORD_WEBHOOK_REZULTATE` (utilizator, verdict, greșeli, scor, durată).

## 1. Pregătește Discord

### Aplicația (OAuth2 + Bot)
1. [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application** → nume.
2. **OAuth2 → General**: copiază **Application ID** (Client ID) → `DISCORD_CLIENT_ID`.
3. **OAuth2 → Redirects**: adaugă `https://DOMENIUL-TAU.vercel.app/api/auth/callback`
   (pentru local: `http://localhost:3000/api/auth/callback`).
4. **OAuth2 → URL Generator**: scope `identify` (opțional `guilds` dacă vrei restricționat la server).
5. **Bot → Reset Token**: copiază tokenul → `DISCORD_BOT_TOKEN`.
6. **Bot → Privileged Gateway Intents**: **Message Content → ON** (nu e strict necesar, dar îl lasă activ).
7. **General → Public Key**: copiază → `DISCORD_PUBLIC_KEY` (nevoie și la General Information).

### Permisiuni bot
- În server: rolul botului → permisiuni **View Channels**, **Send Messages**, **Read Message History**
  (pe canalul HR) și **Create DM** (implicit).
- Botul nu trebuie neapărat admin.

### Interacțiuni (butoanele)
1. **General → Interactions → Interaction Endpoint URL**:
   `https://DOMENIUL-TAU.vercel.app/api/discord/interactions`
2. Apasă **Save Changes** (trimite un PING de testare).
3. La General Information, Activează **PUBLIC BOT** (opțional).

### IDs necesare
- `DISCORD_GUILD_ID` = ID-ul serverului (Developer Mode →右键 pe server → Copy ID)
- `DISCORD_HR_CHANNEL_ID` = ID-ul canalului HR
- `DISCORD_HR_ROLE_IDS` = ID-urile rolurilor autorizate, separate prin virgulă.
  Dacă e gol, **oricine din server** poate apasa butoanele (bine doar pentru testare).

### Setări importante ale candidatului
- Candidatul trebuie să fie **în server** și să aibă **Server Settings → Privacy Levels → Message Requests**
  setat pe *All members* (altfel botul nu îi poate trimite DM).

## 2. Redis (Upstash) — obligatoriu

Fără Redis, datele se pier la fiecare request (Vercel nu are memorie persistentă).

1. [console.upstash.com](https://console.upstash.com) → creează baza de date **Free**.
2. Copiază `UPSTASH_REDIS_REST_URL` și `UPSTASH_REDIS_REST_TOKEN`.

## 3. Vercel

```bash
npm install
npx vercel        # sau importă proiectul din GitHub
```

În **Vercel → Settings → Environment Variables** (pentru Production **și** Preview):

| Cheie | Valoare |
|---|---|
| `APP_URL` | `https://domeniul-tau.vercel.app` (fără slash la final) |
| `DISCORD_CLIENT_ID` | din OAuth2 |
| `DISCORD_CLIENT_SECRET` | din OAuth2 |
| `DISCORD_PUBLIC_KEY` | din General |
| `DISCORD_BOT_TOKEN` | din Bot |
| `DISCORD_GUILD_ID` | id server |
| `DISCORD_HR_CHANNEL_ID` | id canal HR |
| `DISCORD_WEBHOOK_URL` | webhook pentru cererile de cod (opțional, rezervă) |
| `DISCORD_WEBHOOK_REZULTATE` | webhook pentru rapoartele de test |
| `DISCORD_HR_ROLE_IDS` | id-uri roluri HR (opțional) |
| `SESSION_SECRET` | string lung aleator |
| `CODE_SECRET` | alt string lung aleator |
| `UPSTASH_REDIS_REST_URL` | din Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | din Upstash |

Apoi **Redeploy**. Verifică: `https://domeniul-tau.vercel.app/api/health` → `{"ok":true}`.

## 4. Întrebările

Editează fișierele din `intrebari/`:
`smuls.ts`, `rezidentiat.ts`, `bls.ts`, `radio.ts`

```ts
{
  id: 1,
  intrebare: "Ce faci în primul pas?",
  optiuni: ["A", "B", "C"],
  raspunsCorect: "C"     // text IDENTIC cu una dintre optiuni
}
```

Indexul răspunsului corect se calculează automat din `raspunsCorect`
(ignorând diacriticele), deci nu edita el manual.

Timpul și numărul de greșeli se schimbă în `lib/config.ts`.

Verificare: `GET /api/health` → câmpul `bancuri` arată câte întrebări are fiecare
test și dacă vreuna are `raspunsCorect` care nu apare în `optiuni` (lista `probleme`).

## Local

```bash
copy .env.example .env.local     # completează valorile
npm run dev
```

Cu Discord redirecționând către localhost, și tunel, ex:
```bash
npx localtunnel --port 3000
# APP_URL = url-ul tunelului, redirect_uri = url/api/auth/callback
```

## Structura

```
app/
  login/page.tsx              pagina de login
  page.tsx                    lista de teste
  cod/[id]/                   cerere + introducere cod
  test/[id]/                  interfața testului (timer, greșeli)
  api/auth/{login,callback,logout}
  api/cod/{cerere,valideaza}
  api/test/                   GET stare / POST răspuns
  api/discord/interactions/   PING + butoane HR
  api/health/                 diagnostic env vars
lib/
  config.ts   teste, timpi, limite
  cod.ts      generare + hash coduri
  store.ts    Redis (Upstash REST) sau memorie
  auth.ts     sesiuni semnate
  discord.ts  client REST Discord
  intrebari.ts shuffle determinist + verificare răspuns
  semnatura.ts verificare Ed25519 (interactions)
```
