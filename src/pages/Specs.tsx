import { useMemo, useState } from 'react'

import { SpecCard } from '../components/SpecCard'
import { useSpecs } from '../hooks/useSpecs'
import type { Wallet } from '../hooks/useWallet'
import { sameAddress } from '../lib/format'

type Tab = 'all' | 'mine' | 'pending'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My specs' },
  { id: 'pending', label: 'Pending' },
]

export function Specs({ wallet }: { wallet: Wallet }) {
  const { summaries, loading, error, refresh } = useSpecs()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return summaries.filter((spec) => {
      if (tab === 'mine' && !sameAddress(spec.creator, wallet.address)) return false
      if (tab === 'pending' && spec.evaluated) return false
      if (query.length > 0) {
        const haystack = (spec.title + ' ' + spec.id + ' ' + spec.creator).toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [summaries, tab, search, wallet.address])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Specs</h1>
          <p className="muted">
            {summaries.length} spec{summaries.length === 1 ? '' : 's'} in the registry, newest
            first. A verified spec has a rule stored and can be applied by anyone.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? 'tab tab-active' : 'tab'}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <input
          className="input search"
          value={search}
          placeholder="Search title, id or creator"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {tab === 'mine' && !wallet.address ? (
        <p className="muted">
          Connect a wallet to see the specs you created.{' '}
          <button type="button" className="link-button" onClick={() => void wallet.connect()}>
            Connect
          </button>
        </p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      {loading && summaries.length === 0 ? (
        <p className="muted">Reading the registry…</p>
      ) : filtered.length === 0 ? (
        <div className="card empty">
          <p>Nothing here yet.</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {filtered.map((spec) => (
            <SpecCard key={spec.id} spec={spec} />
          ))}
        </div>
      )}
    </div>
  )
}
