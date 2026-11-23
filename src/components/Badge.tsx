import type { ReactNode } from 'react'

export type BadgeTone = 'public' | 'private' | 'ok' | 'pending' | 'muted'

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={'badge badge-' + tone}>{children}</span>
}
