/**
 * Shared config for the MPP-on-Celo example.
 *
 * MPP (Machine Payments Protocol, https://mpp.dev) is an open standard for
 * HTTP-native machine payments. This example uses MPP's `evm/charge` method to
 * gate an API behind a one-time stablecoin payment, settled on Celo.
 *
 * Defaults to Celo Sepolia testnet and USDC. Set MPP_NETWORK=mainnet for Celo
 * mainnet, and MPP_TOKEN=USDC | USDT | USAT to pick the mainnet stablecoin.
 */
import { assets } from 'mppx/evm'

// USAT (Tether America USD) on Celo mainnet. mppx does not ship this as a known
// asset yet, so define it here. Swap for `assets.celo.USAT` once it does.
const celoUSAT = assets.define({
  address: '0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771',
  decimals: 6,
  network: 'eip155:42220',
  transfer: { name: 'Tether America USD', type: 'eip3009', version: '1' },
})

export const NETWORK = (process.env.MPP_NETWORK === 'mainnet' ? 'mainnet' : 'testnet') as
  | 'mainnet'
  | 'testnet'

export const NETWORKS = {
  testnet: {
    chainId: 11142220, // Celo Sepolia
    tokens: { USDC: assets.celoSepolia.USDC },
    facilitator: 'https://api.x402.sepolia.celo.org',
    explorer: 'https://celo-sepolia.blockscout.com/tx/',
    label: 'Celo Sepolia',
  },
  mainnet: {
    chainId: 42220, // Celo
    tokens: { USDC: assets.celo.USDC, USDT: assets.celo.USDT, USAT: celoUSAT },
    facilitator: 'https://api.x402.celo.org',
    explorer: 'https://celoscan.io/tx/',
    label: 'Celo mainnet',
  },
} as const

export const CFG = NETWORKS[NETWORK]
export const PORT = Number(process.env.PORT ?? 3402)
export const SELLER_URL = `http://localhost:${PORT}/premium`

// Stablecoin to charge in. Known assets carry the chain id, decimals, and
// EIP-712 domain, so both seller and buyer can pass them straight to mppx.
export const TOKEN = (process.env.MPP_TOKEN ?? 'USDC').toUpperCase()
const tokens: Record<string, ReturnType<typeof assets.define>> = CFG.tokens
// Object.hasOwn so prototype keys such as "constructor" can't pass as tokens.
if (!Object.hasOwn(tokens, TOKEN)) {
  console.error(
    `MPP_TOKEN=${TOKEN} is not available on ${CFG.label}. Choose one of: ${Object.keys(tokens).join(', ')}`,
  )
  process.exit(1)
}
export const ASSET = tokens[TOKEN]

// Price for the gated endpoint, in display units of the token. "0.01" = one cent.
export const PRICE = '0.01'
