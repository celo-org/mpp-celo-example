/**
 * MPP seller — a payment-gated API on Celo.
 *
 * Uses the Machine Payments Protocol (mppx SDK). A request with no payment gets
 * a 402 carrying an MPP **Challenge**; the buyer pays and retries with a
 * **Credential**; the server settles the stablecoin on Celo and returns a **Receipt**.
 *
 * Run:  npm run seller
 */
import 'dotenv/config' // load .env (cp .env.example .env) before reading process.env
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { Mppx } from 'mppx/server'
import { evm } from 'mppx/evm/server'
import { ASSET, CFG, PORT, PRICE, TOKEN } from './config.js'

if (!process.env.MPP_SECRET_KEY) {
  console.error('Missing MPP_SECRET_KEY. Generate one: openssl rand -base64 32')
  process.exit(1)
}
if (!process.env.SELLER_PAY_TO) {
  console.error('Missing SELLER_PAY_TO (the wallet that receives the payments).')
  process.exit(1)
}
if (!process.env.X402_API_KEY) {
  console.error('Missing X402_API_KEY (facilitator credits). Get one at https://x402.celo.org')
  process.exit(1)
}

// The facilitator is metered — attach the API key to every facilitator RPC.
const apiKeyFetch: typeof fetch = (input, init = {}) => {
  const headers = new Headers(init.headers)
  headers.set('X-API-Key', process.env.X402_API_KEY!)
  return fetch(input, { ...init, headers })
}

// One payment method: a one-time EVM charge on Celo, settled through the
// Celo x402-compatible facilitator (which pays the on-chain gas).
const mppx = Mppx.create({
  methods: [
    // ASSET is a known asset (or `assets.define` for USAT), so mppx infers the
    // chain id, decimals, and EIP-712 domain from it.
    evm.charge({
      currency: ASSET,
      recipient: process.env.SELLER_PAY_TO as `0x${string}`,
      x402: { facilitator: CFG.facilitator, fetch: apiKeyFetch },
    }),
  ],
  secretKey: process.env.MPP_SECRET_KEY!,
})

const app = new Hono()
app.get('/premium', async (c) => {
  // Charge $0.01 for this route. Returns a 402 challenge until paid.
  const result = await mppx.charge({ amount: PRICE })(c.req.raw)
  if (result.status === 402) return result.challenge
  // Paid → attach the MPP receipt to your real response.
  return result.withReceipt(Response.json({ data: 'this response cost $0.01 🎉' }))
})

serve({ fetch: app.fetch, port: PORT })
console.log(`MPP seller listening on http://localhost:${PORT}  (${CFG.label}, ${TOKEN})`)
console.log(`Try:  curl -i http://localhost:${PORT}/premium   → 402 with an MPP challenge`)
