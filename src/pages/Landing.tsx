export function Landing() {
  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">GenLayer · Intelligent Contract</span>
        <h1>Teach a text rule by example.</h1>
        <p className="lede">
          Write three to twelve input → output pairs. ByExample asks an LLM for one regular
          expression, and validators run that rule against <em>every</em> pair — including the
          private ones that never left the contract — before anything is stored.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#/workspace">
            Open the workspace
          </a>
          <a className="btn btn-ghost" href="#/specs">
            Browse the specs
          </a>
        </div>
      </section>

      <section className="grid grid-3">
        <article className="card">
          <h2>Examples in</h2>
          <p>
            A spec is a title, a description and 3–12 examples. Mark some of them private: private
            examples are never put in the prompt, so the model cannot fit to them.
          </p>
        </article>
        <article className="card">
          <h2>One rule out</h2>
          <p>
            The model answers with a pattern, a replacement and flags. Nothing is compared answer
            to answer: the leader's rule is the only artifact, and it has to run.
          </p>
        </article>
        <article className="card">
          <h2>Verified by execution</h2>
          <p>
            Validators replay the rule over the whole set, public and private. Any mismatch, any
            unsafe pattern, and the transaction reverts with nothing stored.
          </p>
        </article>
      </section>

      <section className="split">
        <div className="card">
          <h2>Writing the regex yourself</h2>
          <ul className="list">
            <li>You guess the edge cases, then find out in production.</li>
            <li>Nobody can check the rule against data they were not given.</li>
            <li>The rule lives in your head, not in a public record.</li>
          </ul>
        </div>
        <div className="card card-accent">
          <h2>Showing three examples</h2>
          <ul className="list">
            <li>The examples are the specification, and they are the test.</li>
            <li>Private examples prove the rule generalises without leaking.</li>
            <li>The accepted rule is stored, replayable and free to call.</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <h2>Three steps</h2>
        <ol className="steps">
          <li>
            <span className="step-number">1</span>
            <div>
              <h3>Teach</h3>
              <p>Publish a spec with your examples and mark the ones that stay private.</p>
            </div>
          </li>
          <li>
            <span className="step-number">2</span>
            <div>
              <h3>Evaluate</h3>
              <p>
                The creator runs evaluation once. Leader proposes, validators execute, consensus
                decides.
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
    </div>
  )
}
