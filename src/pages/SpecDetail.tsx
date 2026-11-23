import { useCallback, useEffect, useState } from 'react'

import { Badge } from '../components/Badge'
import { CaseList } from '../components/CaseList'
import { TryIt } from '../components/TryIt'
import { getInjectedProvider } from '../hooks/useWallet'
import type { Wallet } from '../hooks/useWallet'
import { friendlyContractError } from '../lib/errors'
import { formatDate, sameAddress, shortAddress } from '../lib/format'
import { IS_REGISTRY_CONFIGURED, evaluateSpec, fetchResult, fetchSpec } from '../lib/genlayer'
import type { Spec, SpecResult } from '../lib/types'

type SpecDetailProps = {
  specId: string
  wallet: Wallet
}

export function SpecDetail({ specId, wallet }: SpecDetailProps) {
  const [spec, setSpec] = useState<Spec | null>(null)
  const [result, setResult] = useState<SpecResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!IS_REGISTRY_CONFIGURED) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const next = await fetchSpec(specId)
      setSpec(next)
      setResult(next.evaluated ? await fetchResult(specId) : null)
      setError(null)
    } catch (caught) {
      setError(friendlyContractError(caught))
      setSpec(null)
    } finally {
      setLoading(false)
    }
  }, [specId])

  useEffect(() => {
    void load()
  }, [load])

  async function onEvaluate() {
    if (!spec || !wallet.address || busy) return
    setBusy(true)
    setNotice(null)
    setError(null)

    let failure: string | null = null
    try {
      await evaluateSpec(spec.id, wallet.address, getInjectedProvider())
    } catch (caught) {
      failure = friendlyContractError(caught)
    }

    let accepted = false
    try {
      const fresh = await fetchSpec(spec.id)
      setSpec(fresh)
      if (fresh.evaluated) {
        accepted = true
        setResult(await fetchResult(spec.id))
      }
    } catch {
      // keep the previous view; the notice below explains what happened
    }

    if (accepted) {
      setNotice('Rule accepted: it reproduces every example, the private ones included.')
    } else {
      setNotice(
        failure ??
          'No rule was stored. The model did not find a pattern that satisfies every example.',
      )
    }
    setBusy(false)
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Reading {specId}…</p>
      </div>
    )
  }

  if (error || !spec) {
    return (
      <div className="page">
        <a className="link" href="#/specs">
          ← All specs
        </a>
        <div className="card empty">
          <h1>Spec not found</h1>
          <p className="muted">{error ?? 'This spec does not exist on the registry.'}</p>
        </div>
      </div>
    )
  }

  const cases = spec.cases ?? []
  const isOwner = sameAddress(spec.creator, wallet.address)
  const privateCount = cases.filter((item) => !item.public).length

  return (
    <div className="page">
      <a className="link" href="#/specs">
        ← All specs
      </a>

      <div className="page-head">
        <div>
          <h1>{spec.title}</h1>
          <p className="muted">{spec.description || 'No description.'}</p>
        </div>
        <div className="page-head-actions">
          <Badge tone={spec.evaluated ? 'ok' : 'pending'}>
            {spec.evaluated ? 'verified' : 'pending'}
          </Badge>
          <Badge tone="muted">{cases.length} examples</Badge>
          <Badge tone="muted">{privateCount} private</Badge>
        </div>
      </div>

      <div className="meta-row">
        <span className="mono">{spec.id}</span>
        <span className="mono">creator {shortAddress(spec.creator)}</span>
        <span className="mono">created {formatDate(spec.created)}</span>
      </div>

      {notice ? <p className={spec.evaluated ? 'notice' : 'notice notice-warn'}>{notice}</p> : null}

      {spec.evaluated ? (
        <section className="card card-accent">
          <h2>Accepted rule</h2>
          <p className="muted">
            Proposed from the public examples, then replayed by validators over every example
            before it was stored. Evaluation happens once per spec.
          </p>
          <div className="rule">
            <div className="rule-row">
              <span className="rule-label">pattern</span>
              <code className="mono">{result ? result.pattern : '…'}</code>
            </div>
            <div className="rule-row">
              <span className="rule-label">replacement</span>
              <code className="mono">
                {result ? (result.replacement.length > 0 ? result.replacement : '(empty)') : '…'}
              </code>
            </div>
            <div className="rule-row">
              <span className="rule-label">flags</span>
              <code className="mono">{result && result.flags ? result.flags : 'none'}</code>
            </div>
          </div>
        </section>
      ) : isOwner ? (
        <section className="card">
          <h2>Evaluate</h2>
          <p className="muted">
            One run, as the creator. The leader proposes a rule from the {cases.length - privateCount}{' '}
            public examples; validators replay it over all {cases.length} examples, private ones
            included, and refuse anything unsafe.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void onEvaluate()}
            disabled={busy || !IS_REGISTRY_CONFIGURED}
          >
            {busy ? 'Evaluating… this can take a minute' : 'Evaluate this spec'}
          </button>
        </section>
      ) : (
        <section className="card">
          <h2>Pending</h2>
          <p className="muted">
            Only the creator ({shortAddress(spec.creator)}) can evaluate this spec. Until then there
            is no rule to apply.
          </p>
        </section>
      )}

      <section className="card">
        <h2>Examples</h2>
        <CaseList cases={cases} passed={spec.evaluated && result ? result.passed : undefined} />
      </section>

      {spec.evaluated ? <TryIt specId={spec.id} /> : null}
    </div>
  )
}
