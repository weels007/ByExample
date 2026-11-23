import { useState } from 'react'
import type { FormEvent } from 'react'

import { friendlyContractError } from '../lib/errors'
import { applyRule, IS_REGISTRY_CONFIGURED } from '../lib/genlayer'

export function TryIt({ specId }: { specId: string }) {
  const [text, setText] = useState('')
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const next = await applyRule(specId, text)
      setOutput(next)
    } catch (caught) {
      setError(friendlyContractError(caught))
      setOutput(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2>Try it</h2>
      <p className="muted">
        Runs <code>apply(spec_id, text)</code> as a free view. No wallet, nothing is stored.
      </p>

      <form onSubmit={(event) => void onSubmit(event)} className="tryit-form">
        <textarea
          className="input textarea"
          rows={4}
          value={text}
          placeholder="Paste the text you want to clean up…"
          onChange={(event) => setText(event.target.value)}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !IS_REGISTRY_CONFIGURED}
        >
          {busy ? 'Running…' : 'Apply the rule'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {output !== null ? (
        <div className="tryit-output">
          <span className="rule-label">result</span>
          <pre className="mono">{output.length > 0 ? output : '(empty string)'}</pre>
        </div>
      ) : null}
    </section>
  )
}
