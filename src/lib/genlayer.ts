import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

import { withTimeout } from './errors'
import { sameAddress } from './format'
import type { CaseExample, Spec, SpecResult, SpecSummary } from './types'

/**
 * Deployed ByExample registry.
 *
 * Filled in after tests/integration is green: the suite prints
 * `[integration] registry 0x...`. While this stays empty the UI renders a
 * "not deployed yet" state instead of calling a random address.
 */
export const REGISTRY_ADDRESS = '0x7F82C6981049285Fda700DB6daA0A158a6d28134' as `0x${string}` | ''

export const IS_REGISTRY_CONFIGURED = REGISTRY_ADDRESS.length === 42

type ChainInfo = {
  id: number
  name: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  rpcUrls: { default: { http: readonly string[] } }
  blockExplorers?: { default?: { url?: string } }
}

export const CHAIN = studionet as unknown as ChainInfo
export const CHAIN_ID_HEX = '0x' + CHAIN.id.toString(16)

type ContractCall = {
  address: `0x${string}`
  functionName: string
  args?: unknown[]
}

export type GenLayerClient = {
  readContract: (call: ContractCall) => Promise<unknown>
  writeContract: (call: ContractCall) => Promise<string>
  waitForTransactionReceipt: (args: {
    hash: string
    interval?: number
    retries?: number
  }) => Promise<unknown>
}

const create = createClient as unknown as (config: Record<string, unknown>) => GenLayerClient

export const READ_TIMEOUT_MS = 60_000
export const CREATE_TIMEOUT_MS = 360_000
export const EVALUATE_TIMEOUT_MS = 600_000
export const WAIT_INTERVAL_MS = 5_000

let cachedReadClient: GenLayerClient | null = null

export function getReadClient(): GenLayerClient {
  if (!cachedReadClient) {
    cachedReadClient = create({ chain: CHAIN })
  }
  return cachedReadClient
}

/**
 * A provider-backed client. We never call client.connect(): the wallet is
 * connected by useWallet through the injected provider, so the chain is
 * already selected by the time a write is signed.
 */
export function getWalletClient(address: string, provider: unknown): GenLayerClient {
  return create({ chain: CHAIN, account: address, provider })
}

function requireAddress(): `0x${string}` {
  if (!IS_REGISTRY_CONFIGURED) {
    throw new Error(
      'The registry address is not set yet. Run the integration suite, copy the printed address into REGISTRY_ADDRESS in src/lib/genlayer.ts.',
    )
  }
  return REGISTRY_ADDRESS as `0x${string}`
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value.length === 0) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const READ_TIMEOUT_MESSAGE = 'The registry did not answer in time. Try again in a moment.'

export async function fetchSpecCount(): Promise<number> {
  const raw = await withTimeout(
    getReadClient().readContract({
      address: requireAddress(),
      functionName: 'spec_count',
      args: [],
    }),
    READ_TIMEOUT_MS,
    READ_TIMEOUT_MESSAGE,
  )
  return Number(raw ?? 0)
}

export async function fetchSpecSummaries(): Promise<SpecSummary[]> {
  const raw = await withTimeout(
    getReadClient().readContract({
      address: requireAddress(),
      functionName: 'list_specs',
      args: [],
    }),
    READ_TIMEOUT_MS,
    READ_TIMEOUT_MESSAGE,
  )
  return parseJson<SpecSummary[]>(raw, [])
}

export async function fetchSpec(specId: string): Promise<Spec> {
  const raw = await withTimeout(
    getReadClient().readContract({
      address: requireAddress(),
      functionName: 'get_spec',
      args: [specId],
    }),
    READ_TIMEOUT_MS,
    READ_TIMEOUT_MESSAGE,
  )
  const parsed = parseJson<Spec | null>(raw, null)
  if (!parsed || typeof parsed.id !== 'string') {
    throw new Error('Spec ' + specId + ' could not be read.')
  }
  return parsed
}

export async function fetchResult(specId: string): Promise<SpecResult | null> {
  const raw = await withTimeout(
    getReadClient().readContract({
      address: requireAddress(),
      functionName: 'get_result',
      args: [specId],
    }),
    READ_TIMEOUT_MS,
    READ_TIMEOUT_MESSAGE,
  )
  return parseJson<SpecResult | null>(raw, null)
}

export async function applyRule(specId: string, text: string): Promise<string> {
  const raw = await withTimeout(
    getReadClient().readContract({
      address: requireAddress(),
      functionName: 'apply',
      args: [specId, text],
    }),
    READ_TIMEOUT_MS,
    READ_TIMEOUT_MESSAGE,
  )
  if (typeof raw === 'string') return raw
  return raw === null || raw === undefined ? '' : String(raw)
}

export type CreateSpecInput = {
  title: string
  description: string
  cases: CaseExample[]
}

function specNumber(specId: string): number {
  const value = Number(specId.replace('spec-', ''))
  return Number.isFinite(value) ? value : 0
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/**
 * The id is not part of a transaction's receipt, and reading spec_count after
 * the write picks up anyone else's spec created in the same block. So take the
 * counter before signing and return the first spec above that snapshot that
 * belongs to this wallet.
 */
async function findOwnSpecAfter(before: number, address: string): Promise<string | null> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const after = await fetchSpecCount()
    if (after > before) {
      const summaries = await fetchSpecSummaries()
      const mine = summaries
        .filter((item) => sameAddress(item.creator, address) && specNumber(item.id) > before)
        .sort((a, b) => specNumber(a.id) - specNumber(b.id))
      if (mine.length > 0) return mine[0].id
    }
    await delay(1500)
  }
  return null
}

export async function createSpec(
  input: CreateSpecInput,
  address: string,
  provider: unknown,
): Promise<string> {
  const before = await fetchSpecCount()

  const client = getWalletClient(address, provider)
  const hash = await client.writeContract({
    address: requireAddress(),
    functionName: 'create_spec',
    args: [input.title, input.description, JSON.stringify(input.cases)],
  })

  await client.waitForTransactionReceipt({
    hash,
    interval: WAIT_INTERVAL_MS,
    retries: Math.floor(CREATE_TIMEOUT_MS / WAIT_INTERVAL_MS),
  })

  const specId = await findOwnSpecAfter(before, address)
  if (!specId) {
    throw new Error(
      'The transaction did not create a spec. Nothing was stored — check your wallet and the examples, then try again.',
    )
  }
  return specId
}

export async function evaluateSpec(
  specId: string,
  address: string,
  provider: unknown,
): Promise<void> {
  const client = getWalletClient(address, provider)
  const hash = await client.writeContract({
    address: requireAddress(),
    functionName: 'evaluate',
    args: [specId],
  })
  await client.waitForTransactionReceipt({
    hash,
    interval: WAIT_INTERVAL_MS,
    retries: Math.floor(EVALUATE_TIMEOUT_MS / WAIT_INTERVAL_MS),
  })
}
