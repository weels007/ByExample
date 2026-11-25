import { useState } from 'react'

import { SpecCard } from '../components/SpecCard'
import { SpecComposer } from '../components/SpecComposer'
import { navigate } from '../hooks/useHashRoute'
import { useSpecs } from '../hooks/useSpecs'
import type { Wallet } from '../hooks/useWallet'
import { IS_REGISTRY_CONFIGURED } from '../lib/genlayer'

export function Workspace({ wallet }: { wallet: Wallet }) {
  const { summaries, count, loading, error, refresh } = useSpecs()
  const [composing, setComposing] = useState(false)

  const evaluated = summaries.filter((spec) => spec.evaluated).length
  const pending = summaries.length - evaluated

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Workspace</h1>
          <p className="muted">
            Everything the registry holds, newest first. Publish a spec, evaluate it once, then
            anyone can apply it.
          </p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-ghost" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setComposing(true)}
            disabled={!IS_REGISTRY_CONFIGURED}
          >
            New spec
          </button>
        </div>
      </div>

      <section className="grid grid-3">
        <article className="stat">
          <span className="stat-value">{count === null ? '—' : count}</span>
          <span className="stat-label">specs in the registry</span>
        </article>
        <article className="stat">
          <span className="stat-value">{evaluated}</span>
          <span className="stat-label">evaluated, rule stored</span>
        </article>
        <article className="stat">
          <span className="stat-value">{pending}</span>
          <span className="stat-label">waiting for their creator</span>
        </article>
      </section>

      {composing ? (
        <SpecComposer
          wallet={wallet}
          onClose={() => setComposing(false)}
          onCreated={(specId) => {
            setComposing(false)
            navigate('/specs/' + specId)
          }}
        />
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <section>
        <div className="section-head">
          <h2>Latest specs</h2>
          <a className="link" href="#/specs">
            See all
          </a>
        </div>

        {loading && summaries.length === 0 ? (
          <div className="grid grid-3">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : summaries.length === 0 ? (
          <div className="card empty">
            <p>No specs yet. The first one is yours.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setComposing(true)}
              disabled={!IS_REGISTRY_CONFIGURED}
            >
              New spec
            </button>
          </div>
        ) : (
          <div className="grid grid-3">
            {summaries.slice(0, 6).map((spec) => (
              <SpecCard key={spec.id} spec={spec} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
