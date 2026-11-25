const SAMPLES = [
  { input: 'Hello world!!', output: 'Hello world', tone: '' },
  { input: 'Ship it!', output: 'Ship it', tone: '' },
  { input: 'Done!!!', output: 'Done', tone: 'is-private' },
]

const STATS = [
  { value: '3–12', label: 'examples per spec' },
  { value: '1', label: 'rule the model proposes' },
  { value: '0', label: 'tolerance when it is replayed' },
]

export function Landing() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy rise">
          <span className="eyebrow">GenLayer · Intelligent Contract</span>
          <h1>
            Teach a text rule
            <br />
            <span className="accent">with examples.</span>
          </h1>
          <p className="lede">
            Write three to twelve input → output pairs. ByExample asks an LLM for one regex, then
            validators <em>run</em> that rule over every pair — including the private pairs that never
            left the contract — before anything is stored.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#/workspace">
              Open the workspace
            </a>
            <a className="btn btn-ghost" href="#/specs">
              Browse the specs
            </a>
          </div>
          <p className="hero-note">No regex to write, no tolerance to tune: the proof is execution.</p>
        </div>

        <aside className="showcase rise rise-2" aria-hidden="true">
          <div className="showcase-head">
            <span className="showcase-spec">spec-000001</span>
            <span className="badge badge-ok">verified</span>
          </div>
          <p className="showcase-title">Drop trailing exclamation marks</p>

          <div className="sample">
            {SAMPLES.map((sample, index) => (
              <div key={index} className={'sample-row' + (sample.tone ? ' ' + sample.tone : '')}>
                <span>{sample.input}</span>
                <span className="sample-arrow">→</span>
                <span>{sample.output}</span>
              </div>
            ))}
          </div>

          <div className="showcase-rule">
            <span className="sample-label">rule</span>
            <strong>!+$</strong>
            <span className="caret" />
          </div>

          <div className="showcase-foot">
            <span>replayed against every pair</span>
            <span className="mono">3 / 3 ✓</span>
          </div>
        </aside>
      </section>

      <section className="grid grid-3">
        {STATS.map((stat) => (
          <article key={stat.label} className="stat">
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </article>
        ))}
      </section>

      <section className="split">
        <article className="card">
          <h2>Writing the regex yourself</h2>
          <ul className="list">
            <li>You guess the edge cases, then meet them in production.</li>
            <li>Nobody can check a rule against data they were never given.</li>
            <li>The rule lives in your head, not in a public record.</li>
          </ul>
        </article>
        <article className="card card-accent">
          <h2>Showing three examples</h2>
          <ul className="list">
            <li>The examples are the specification, and they are the test.</li>
            <li>Private examples prove the rule generalises without leaking.</li>
            <li>The accepted rule is stored, replayable, and free to call.</li>
          </ul>
        </article>
      </section>

      <section className="card">
        <h2>Three steps</h2>
        <ol className="steps">
          <li>
            <span className="step-number">1</span>
            <div>
              <h3>Teach</h3>
              <p>Publish a spec with your examples, and mark the ones that stay private.</p>
            </div>
          </li>
          <li>
            <span className="step-number">2</span>
            <div>
              <h3>Evaluate</h3>
              <p>
                The creator runs evaluation once. The leader proposes a rule, validators execute it, and
                consensus decides.
              </p>
            </div>
          </li>
          <li>
            <span className="step-number">3</span>
            <div>
              <h3>Apply</h3>
              <p>
                Anyone calls <code>apply(spec_id, text)</code> as a read-only view and gets the same
                transformation, forever.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="card card-accent">
        <div className="section-head">
          <h2>Ready to teach one?</h2>
          <a className="link mono" href="#/how-it-works">
            how consensus works →
          </a>
        </div>
        <p className="muted">
          A spec takes a title, a description and a handful of pairs. The rest is one transaction and a
          rule that outlives it.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#/workspace">
            New spec
          </a>
          <a className="btn btn-ghost" href="#/specs">
            See what others taught
          </a>
        </div>
      </section>
    </div>
  )
}
