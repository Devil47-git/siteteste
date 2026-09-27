# Cum dau deploy pe Vercel — fără să mă încurc

## Ordinea corectă (cea care funcționează)

1. **Mai întâi** fă `git add -A` + `git commit` + `git push origin main`
2. **Abia apoi** apeși Redeploy în Vercel
3. Asteapta build-ul sa se termine

> Dacă apeși Redeploy **înainte** de push, Vercel construiește codul vechi
> și dă aceeași eroare, oricât de câte ori repeți.

## Ce să verifici ca să știi că a mers

Deschide: `https://teste-site-ten-delta.vercel.app/api/health`

Trebuie să arate:
```json
{"ok":true, "lipsa":[], ...}
```

- `"ok":true` → totul e setat corect
- `"lipsa": ["CINEVA"]` → îi lipsesc ale acelei variabile din Environment Variables
- `{"store":"MEMORIE (dev)"}` → nu e setat Upstash; pe Vercel nu merge fără el

## Dacă build-ul pică

Logul pe care ți-l dă Vercel e suficient — trimite-mi **tot** ce apare.
Nu am nevoie de nimic mai mult.

## Redeploy fără să schimbi nimic în cod

**Deployments** → deployment-ul eșuat → **⋯** → **Redeploy**
