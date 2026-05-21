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
- La sezione "Monthly special" guida gli utenti a comprare PAPPARDELLE su Zora, richiederle dal faucet e comprare il monthly pass con PAPPARDELLE.
- La UI include un hook di compatibilita per MiniPay e Farcaster Mini Apps: rileva MiniPay, chiama `sdk.actions.ready()` in Farcaster e usa il provider Farcaster quando disponibile.
- Il progetto espone `/.well-known/farcaster.json`, `/manifest.json`, meta `fc:miniapp` / `fc:frame` e un webhook Farcaster minimale.
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
3. Configura `REFERRAL_CLAIM_SIGNER_PRIVATE_KEY` su Vercel. Deve essere la private key del wallet `claimSigner` del registry Celo.
4. Ridistribuisci la web app.

Il progetto include gia il registrar API in:

```text
/api/referral/authorize
```

Questo endpoint controlla il receipt della transazione su Base, verifica l'evento `Claimed(account, amount)` dal vault faucet e restituisce una firma EIP-712 per `register(referrer, baseClaimTxHash, deadline, signature)` sul registry Celo.

## Variabili Vercel

```text
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_TOKEN_ADDRESS=0x41859a1048fb4f8d668861b1249504bf52e6d3bd
NEXT_PUBLIC_FAUCET_ADDRESS=0xCE749CDe53b8E6791F300555d9ee8b1Df9B21f65
NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS=0xAD85C867587F642Ba2303731F32fEA252838A025
NEXT_PUBLIC_REFERRAL_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_REFERRAL_AUTH_API_URL=/api/referral/authorize
NEXT_PUBLIC_MONTHLY_PASS_PRICE=10000000
NEXT_PUBLIC_MONTHLY_PASS_RECIPIENT=0x...
REFERRAL_CLAIM_SIGNER_PRIVATE_KEY=0x...
REFERRAL_SIGNATURE_TTL_SECONDS=900
FARCASTER_ACCOUNT_ASSOCIATION_HEADER=...
FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD=...
FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE=...
```

`REFERRAL_CLAIM_SIGNER_PRIVATE_KEY` non deve mai essere `NEXT_PUBLIC`. Non serve tenerci CELO se usi la modalita firma: il signer autorizza, mentre l'utente invia la transazione `register(...)` su Celo.

`NEXT_PUBLIC_MONTHLY_PASS_RECIPIENT` abilita il bottone "Buy monthly pass using PAPPARDELLE". La UI invia `NEXT_PUBLIC_MONTHLY_PASS_PRICE` token PAPPARDELLE a quell'indirizzo tramite `transfer()` ERC-20 su Base.

## MiniPay e Farcaster

MiniPay gira su Celo: la leaderboard referral su Celo funziona nel client MiniPay, mentre il claim del token PAPPARDELLE resta su Base e richiede un wallet compatibile con Base. Il hook `useMiniAppCompatibility` rileva MiniPay con `window.ethereum.isMiniPay`, auto-collega il wallet e mostra lo stato corretto nella UI.

Per pubblicare come Farcaster Mini App, compila le tre variabili `FARCASTER_ACCOUNT_ASSOCIATION_*` con la firma del tuo account Farcaster. Senza quelle variabili il manifest e i meta tag sono presenti, ma la ownership del dominio non e ancora associata al tuo FID.

## Nota anti-abuso

Questo progetto garantisce "una volta per wallet". Un utente puo comunque creare piu wallet. Se vuoi "una volta per persona", serve aggiungere una prova esterna, per esempio allowlist firmata, captcha con backend, account social verificato o attestazione.
