# PAPPARDELLE Faucet su Base

Faucet Vercel + smart contract vault per distribuire token PAPPARDELLE una sola volta per wallet.

Token Base configurato di default:

```text
0x41859a1048fb4f8d668861b1249504bf52e6d3bd
```

Vault faucet deployato:

```text
0xCE749CDe53b8E6791F300555d9ee8b1Df9B21f65
```

Referral registry Celo deployato:

```text
0xAD85C867587F642Ba2303731F32fEA252838A025
```

## Come funziona

- Il contratto `PappardelleFaucetVault` custodisce i token.
- Ogni wallet puo chiamare `claim()` una sola volta.
- Il limite e salvato on-chain in `hasClaimed(address)`.
- Il contratto opzionale `PappardelleReferralRegistry` viene deployato su Celo mainnet e assegna punti on-chain per un futuro airdrop.
- La UI legge `?ref=0x...`, mostra la leaderboard Celo e puo chiedere al registrar di sincronizzare i punti dopo il claim.
- Vercel ospita solo la UI, quindi non serve mettere una private key nel frontend.
- Il proprietario puo mettere in pausa il faucet, cambiare `claimAmount` e ritirare token dal vault.

## Setup locale

```bash
pnpm install
cp .env.example .env.local
```

Per il deploy del contratto copia anche le variabili private in `.env` oppure esportale nel terminale.

```bash
pnpm run compile
pnpm run dev
```

## Deploy del vault

Imposta:

```text
DEPLOYER_PRIVATE_KEY=0x...
BASE_RPC_URL=https://mainnet.base.org
TOKEN_ADDRESS=0x41859a1048fb4f8d668861b1249504bf52e6d3bd
TOKEN_DECIMALS=18
CLAIM_AMOUNT=1000
```

Poi:

```bash
pnpm run deploy:base
```

Dopo il deploy:

1. Trasferisci token PAPPARDELLE all'indirizzo del vault stampato dallo script.
2. Imposta `NEXT_PUBLIC_FAUCET_ADDRESS` con l'indirizzo del vault.
3. Deploya la web app su Vercel.

## Deploy referral registry su Celo

Il vault faucet resta su Base. Il registry referral e su Celo, quindi non puo leggere direttamente `hasClaimed(address)` dal vault Base. Per evitare punti falsi, il registry accetta solo registrazioni autorizzate da un signer/registrar che verifica il claim su Base.

Imposta:

```text
CELO_RPC_URL=https://forno.celo.org
REFERRAL_POINTS_PER_CLAIM=1
REFERRAL_CLAIM_SIGNER=0x...
```

Poi:

```bash
pnpm run deploy:referral:celo
```

Dopo il deploy:

1. Imposta `NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS` su Vercel.
2. Imposta `NEXT_PUBLIC_REFERRAL_RPC_URL=https://forno.celo.org` oppure un RPC Celo dedicato.
3. Collega un registrar/API che controlla il claim su Base e chiama `recordReferral(account, referrer, baseClaimTxHash)` su Celo, oppure restituisce una firma EIP-712 per `register(...)`.
4. Ridistribuisci la web app.

## Variabili Vercel

```text
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_TOKEN_ADDRESS=0x41859a1048fb4f8d668861b1249504bf52e6d3bd
NEXT_PUBLIC_FAUCET_ADDRESS=0xCE749CDe53b8E6791F300555d9ee8b1Df9B21f65
NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS=0xAD85C867587F642Ba2303731F32fEA252838A025
NEXT_PUBLIC_REFERRAL_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_REFERRAL_AUTH_API_URL=https://...
```

## Nota anti-abuso

Questo progetto garantisce "una volta per wallet". Un utente puo comunque creare piu wallet. Se vuoi "una volta per persona", serve aggiungere una prova esterna, per esempio allowlist firmata, captcha con backend, account social verificato o attestazione.
