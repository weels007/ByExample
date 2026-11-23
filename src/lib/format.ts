export function shortAddress(address: string | null | undefined): string {
  if (!address) return ''
  if (address.length <= 12) return address
  return address.slice(0, 6) + '…' + address.slice(-4)
}

export function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return a.toLowerCase() === b.toLowerCase()
}

export function formatDate(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1) + '…'
}

export function visibleWhitespace(text: string): string {
  return text.replace(/\n/g, '⏎').replace(/\t/g, '⇥')
}
