import { useCallback, useEffect, useRef, useState } from 'react'

import { friendlyWalletError } from '../lib/errors'
import { CHAIN, CHAIN_ID_HEX } from '../lib/genlayer'

export type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (payload: unknown) => void) => void
  removeListener?: (event: string, handler: (payload: unknown) => void) => void
}

export type Wallet = {
  address: `0x${string}` | null
  chainId: string | null
  connecting: boolean
  available: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  clearError: () => void
}

export function getInjectedProvider(): InjectedProvider | null {
  const win = window as unknown as { ethereum?: InjectedProvider }
  return win.ethereum ?? null
}

// Single flight: a second eth_requestAccounts while one is open makes wallets
// answer -32002 and we must not retry that.
let accountsRequest: Promise<string[]> | null = null

function requestAccounts(provider: InjectedProvider): Promise<string[]> {
  if (accountsRequest) return accountsRequest
  const pending = provider
    .request({ method: 'eth_requestAccounts' })
    .then((value) => (Array.isArray(value) ? (value as string[]) : []))
  accountsRequest = pending.finally(() => {
    accountsRequest = null
  })
  return pending
}

async function readAccounts(provider: InjectedProvider): Promise<string[]> {
  try {
    const value = await provider.request({ method: 'eth_accounts' })
    return Array.isArray(value) ? (value as string[]) : []
  } catch {
    return []
  }
}

async function ensureChain(provider: InjectedProvider): Promise<void> {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID_HEX }],
    })
    return
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code !== 4902) throw error
  }

  await provider.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: CHAIN_ID_HEX,
        chainName: CHAIN.name,
        nativeCurrency: CHAIN.nativeCurrency,
        rpcUrls: [...CHAIN.rpcUrls.default.http],
        blockExplorerUrls: CHAIN.blockExplorers?.default?.url
          ? [CHAIN.blockExplorers.default.url]
          : undefined,
      },
    ],
  })

  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: CHAIN_ID_HEX }],
  })
}

export function useWallet(): Wallet {
  const [address, setAddress] = useState<`0x${string}` | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [available, setAvailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const connectingRef = useRef(false)

  useEffect(() => {
    const provider = getInjectedProvider()
    setAvailable(provider !== null)
    if (!provider) return

    let cancelled = false
    void (async () => {
      const accounts = await readAccounts(provider)
      if (cancelled) return
      if (accounts.length > 0) {
        setAddress(accounts[0] as `0x${string}`)
        try {
          const current = await provider.request({ method: 'eth_chainId' })
          if (!cancelled && typeof current === 'string') setChainId(current)
        } catch {
          // reading the chain is best effort
        }
      }
    })()

    const onAccountsChanged = (payload: unknown) => {
      const next = Array.isArray(payload) ? (payload as string[]) : []
      setAddress(next.length > 0 ? (next[0] as `0x${string}`) : null)
    }
    const onChainChanged = (payload: unknown) => {
      setChainId(typeof payload === 'string' ? payload : null)
    }

    provider.on?.('accountsChanged', onAccountsChanged)
    provider.on?.('chainChanged', onChainChanged)

    return () => {
      cancelled = true
      provider.removeListener?.('accountsChanged', onAccountsChanged)
      provider.removeListener?.('chainChanged', onChainChanged)
    }
  }, [])

  const connect = useCallback(async () => {
    const provider = getInjectedProvider()
    if (!provider) {
      setError('No browser wallet found. Open this page in a wallet browser or install MetaMask.')
      return
    }
    if (connectingRef.current) return
    connectingRef.current = true
    setConnecting(true)
    setError(null)
    try {
      const accounts = await requestAccounts(provider)
      if (accounts.length === 0) {
        setError('Your wallet returned no account.')
        return
      }
      setAddress(accounts[0] as `0x${string}`)
      await ensureChain(provider)
      const current = await provider.request({ method: 'eth_chainId' })
      setChainId(typeof current === 'string' ? current : null)
    } catch (caught) {
      setError(friendlyWalletError(caught))
    } finally {
      connectingRef.current = false
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setChainId(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { address, chainId, connecting, available, error, connect, disconnect, clearError }
}
