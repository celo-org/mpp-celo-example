# mpp-celo-example

A minimal, runnable example of **[Machine Payments Protocol (MPP)](https://mpp.dev)** payments on **Celo** — a seller that charges $0.01 in USDC for an API endpoint, and a buyer that pays for it automatically. No gas for the buyer; settlement is handled on Celo by the hosted facilitator at [x402.celo.org](https://x402.celo.org).

Verified end-to-end on Celo (testnet **and** mainnet).

## What MPP does here

MPP is an open standard for HTTP-native machine payments. A request with no
payment gets a `402` carrying a **Challenge**; the buyer signs a **Credential**
and retries; the server settles the USDC on Celo and returns a **Receipt** with
the on-chain transaction.

```
buyer ──GET /premium──▶ seller
seller ──402 + WWW-Authenticate: Payment (challenge)──▶ buyer
buyer ──signs credential, retries with Authorization──▶ seller
seller ──settles USDC on Celo──▶ 200 + Payment-Receipt (tx hash)
```

The buyer pays **no gas** — the facilitator submits the transfer and sponsors
the gas. USDC moves buyer → seller directly via EIP-3009.

> This example covers MPP's **one-time charge** — a fixed price per request,
> which is what MPP supports on Celo today.

## Quick start (Celo Sepolia testnet)

```bash
npm install
cp .env.example .env      # fill in the values below
chmod 600 .env
```

`.env` needs:

1. **`MPP_SECRET_KEY`** — signs/verifies MPP challenges & receipts.
   `openssl rand -base64 32`
2. **`X402_API_KEY`** — settlement credits, from <https://x402.celo.org>
   (connect wallet → Create API key). Free credits to start.
3. **`SELLER_PAY_TO`** — the wallet that receives the USDC.
4. **`BUYER_PRIVATE_KEY`** — a throwaway wallet funded with a little Celo Sepolia
   USDC from <https://faucet.circle.com>. No native CELO needed.

Then, in two terminals:

```bash
npm run seller     # terminal 1 — starts the paid API on :3402
npm run buyer      # terminal 2 — pays for it and prints the settlement tx hash
```

The buyer prints `200`, the protected content, and a block-explorer link to the
settlement transaction. Your facilitator credit count drops by one.

## Inspect the 402 by hand

```bash
curl -i http://localhost:3402/premium
# → HTTP/1.1 402 Payment Required, with a WWW-Authenticate: Payment challenge
```

## Going to mainnet

Set `MPP_NETWORK=mainnet` (in `.env`) and use a real wallet funded with mainnet
USDC. Test on testnet first.

## Files

| File | What |
|------|------|
| `src/seller.ts` | The paid API — `Mppx.create` + `evm.charge`, returns challenge / receipt |
| `src/buyer.ts` | The paying client — `Mppx.create` + `evm.charge`, auto-pays 402s |
| `src/config.ts` | Network config (Celo Sepolia / mainnet), USDC, facilitator |

## Two things worth knowing

- **Seller** can pass the known asset (`assets.celo.USDC` / `assets.celoSepolia.USDC`)
  as the currency — mppx infers the chain id, decimals, and EIP-712 domain.
- **Buyer** must supply the token `decimals` and its EIP-712 `authorization`
  (`{ name: 'USDC', version: '2' }`) itself — the client builds the payment
  credential locally and does not read those from the challenge. Omitting them
  errors with `EVM charge maxAmount requires currency decimals.` or
  `EVM authorization requires token name and version.` See `src/buyer.ts`.

## Learn more

- MPP protocol: <https://mpp.dev>
- `mppx` SDK: <https://www.npmjs.com/package/mppx>
- Facilitator dashboard (API key + credits): <https://x402.celo.org>
- Celo docs — MPP: <https://docs.celo.org/build-on-celo/build-with-ai/mpp>
