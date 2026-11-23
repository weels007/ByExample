const WALLET_REJECTED = 4001
const WALLET_PENDING = -32002
const CHAIN_MISSING = 4902

type CodedError = { code?: number; message?: string; shortMessage?: string }

export function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  const coded = error as CodedError
  if (coded && typeof coded.message === 'string' && coded.message.length > 0) return coded.message
  return 'Something went wrong. Try again.'
}

export function friendlyWalletError(error: unknown): string {
  const coded = (error ?? {}) as CodedError
  if (coded.code === WALLET_REJECTED) {
    return 'You rejected the request in your wallet.'
  }
  if (coded.code === WALLET_PENDING) {
    return 'Your wallet already has a pending request. Open it and finish that one first.'
  }
  if (coded.code === CHAIN_MISSING) {
    return 'Your wallet does not know this network yet. Approve adding it, then try again.'
  }
  const text = friendlyError(error)
  if (text.length > 220) return text.slice(0, 217) + '…'
  return text
}

export function friendlyContractError(error: unknown): string {
  const text = friendlyError(error)
  if (text.length > 400) return text.slice(0, 397) + '…'
  return text
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}
