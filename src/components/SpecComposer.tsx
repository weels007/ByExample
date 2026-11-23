import { useState } from 'react'
import type { FormEvent } from 'react'

import { getInjectedProvider } from '../hooks/useWallet'
import type { Wallet } from '../hooks/useWallet'
import { friendlyContractError } from '../lib/errors'
import { createSpec, IS_REGISTRY_CONFIGURED } from '../lib/genlayer'
import {
  MAX_CASES,
  MAX_CASE_TEXT,
  MAX_CASE_TOTAL,
  MAX_DESCRIPTION,
  MAX_TITLE,
  MIN_CASES,
} from '../lib/types'
import type { CaseExample } from '../lib/types'

type Draft = { input: string; output: string; public: boolean }

type SpecComposerProps = {
  wallet: Wallet
  onClose: () => void
  onCreated: (specId: string) => void
}

function initialDrafts(): Draft[] {
  return [
    { input: '', output: '', public: true },
    { input: '', output: '', public: true },
    { input: '', output: '', public: false },
  ]
}

function validate(title: string, description: string, drafts: Draft[]): string | null {
  if (title.trim().length === 0) return 'Give the spec a title.'
  if (title.trim().length > MAX_TITLE) return 'The title must be at most ' + MAX_TITLE + ' characters.'
  if (description.trim().length > MAX_DESCRIPTION) {
    return 'The description must be at most ' + MAX_DESCRIPTION + ' characters.'
  }
  if (drafts.length < MIN_CASES) return 'Add at least ' + MIN_CASES + ' examples.'
  if (drafts.length > MAX_CASES) return 'A spec holds at most ' + MAX_CASES + ' examples.'

  const seen = new Set<string>()
  let total = 0
  let publicCount = 0

  for (const draft of drafts) {
    if (draft.input.length === 0) return 'Every example needs an input.'
    if (draft.input.length > MAX_CASE_TEXT) {
      return 'An example input must be at most ' + MAX_CASE_TEXT + ' characters.'
    }
    if (draft.output.length > MAX_CASE_TEXT) {
      return 'An example output must be at most ' + MAX_CASE_TEXT + ' characters.'
    }
    if (seen.has(draft.input)) return 'Two examples share the same input.'
    seen.add(draft.input)
    total += draft.input.length + draft.output.length
    if (draft.public) publicCount += 1
  }

  if (total > MAX_CASE_TOTAL) {
    return 'All examples together must be at most ' + MAX_CASE_TOTAL + ' characters.'
  }
  if (publicCount < 2) return 'At least 2 examples must be public.'
  if (publicCount === drafts.length) return 'Mark at least 1 example private.'
  return null
}

export function SpecComposer({ wallet, onClose, onCreated }: SpecComposerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((current) => current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)))
  }

  function addDraft() {
    setDrafts((current) => {
      if (current.length >= MAX_CASES) return current
      return [...current, { input: '', output: '', public: false }]
    })
  }

  function removeDraft(index: number) {
    setDrafts((current) => {
      if (current.length <= MIN_CASES) return current
      return current.filter((_, i) => i !== index)
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return

    const problem = validate(title, description, drafts)
    if (problem) {
      setError(problem)
      return
    }
    if (!wallet.address) {
      await wallet.connect()
      setError('Connect a wallet, then publish the spec.')
      return
    }

    const cases: CaseExample[] = drafts.map((draft) => ({
      input: draft.input,
      output: draft.output,
      public: draft.public,
    }))

    setBusy(true)
    setError(null)
    try {
      const specId = await createSpec(
        { title: title.trim(), description: description.trim(), cases },
        wallet.address,
        getInjectedProvider(),
      )
      onCreated(specId)
    } catch (caught) {
      setError(friendlyContractError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card composer">
      <div className="composer-head">
        <h2>New spec</h2>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Close
        </button>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="composer-form">
        <label className="field">
          <span className="field-label">Title</span>
          <input
            className="input"
            value={title}
            maxLength={MAX_TITLE}
            placeholder="Drop trailing exclamation marks"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Description</span>
          <input
            className="input"
            value={description}
            maxLength={MAX_DESCRIPTION}
            placeholder="What the transformation does, in one line"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <div className="field">
          <span className="field-label">Examples ({drafts.length})</span>
          <div className="drafts">
            {drafts.map((draft, index) => (
              <div key={index} className="draft">
                <div className="draft-head">
                  <span className="case-index">#{index + 1}</span>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={draft.public}
                      onChange={(event) => updateDraft(index, { public: event.target.checked })}
                    />
                    <span>{draft.public ? 'public' : 'private'}</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => removeDraft(index)}
                    disabled={drafts.length <= MIN_CASES}
                  >
                    Remove
                  </button>
                </div>
                <div className="draft-body">
                  <input
                    className="input"
                    value={draft.input}
                    placeholder="input"
                    onChange={(event) => updateDraft(index, { input: event.target.value })}
                  />
                  <span className="draft-arrow">→</span>
                  <input
                    className="input"
                    value={draft.output}
                    placeholder="output"
                    onChange={(event) => updateDraft(index, { output: event.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={addDraft}
            disabled={drafts.length >= MAX_CASES}
          >
            Add example
          </button>
        </div>

        <p className="muted">
          Private examples never reach the model. They are only used to check the rule the model
          returns, so the stored result is verified against data nobody saw.
        </p>

        {error ? <p className="error">{error}</p> : null}

        <div className="composer-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !IS_REGISTRY_CONFIGURED}
          >
            {busy ? 'Publishing…' : 'Publish spec'}
          </button>
          {!wallet.address ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void wallet.connect()}
              disabled={wallet.connecting}
            >
              {wallet.connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
