export function HowItWorks() {
  return (
    <div className="page">
      <section className="hero hero-small">
        <span className="eyebrow">Consensus</span>
        <h1>How a spec becomes a rule</h1>
        <p className="lede">
          ByExample does not compare answers. It compares whether the leader's artifact — one
          regular expression — actually reproduces every example on record.
        </p>
      </section>

      <section className="card">
        <h2>The flow</h2>
        <ol className="steps">
          <li>
            <span className="step-number">1</span>
            <div>
              <h3>create_spec</h3>
              <p>
                The examples are validated (count, lengths, duplicate inputs, at least 2 public and
                1 private) and stored as JSON in the registry. Private examples are stored on chain
                but never leave the contract.
              </p>
            </div>
          </li>
          <li>
            <span className="step-number">2</span>
            <div>
              <h3>The leader asks for a rule</h3>
              <p>
                Inside a non-deterministic block the prompt carries the public examples only, plus
                a reminder that examples are data and never instructions. The model answers with{' '}
                <code>{'{"pattern", "replacement", "flags"}'}</code>.
              </p>
            </div>
          </li>
          <li>
            <span className="step-number">3</span>
            <div>
              <h3>Validators execute the artifact</h3>
              <p>
                Each validator compiles the leader's pattern and runs it over the whole set,
                public and private. It agrees only when every output matches, the pattern and the
                replacement are at most 200 characters, the flags come from <code>i</code>,{' '}
                <code>m</code> and <code>s</code>, and the pattern passes the ReDoS guard.
              </p>
            </div>
          </li>
          <li>
            <span className="step-number">4</span>
            <div>
              <h3>Store, or revert</h3>
              <p>
                A disagreement rotates the leader. If no rule survives, the transaction reverts
                with a readable reason and nothing is stored — the spec stays pending, and its
                creator can try again.
              </p>
            </div>
          </li>
          <li>
            <span className="step-number">5</span>
            <div>
              <h3>apply is free</h3>
              <p>
                Once accepted, the rule is stored with its per-example verdicts.{' '}
                <code>apply(spec_id, text)</code> replays it deterministically as a read-only view.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <h2>Why private examples matter</h2>
          <p>
            A model can always fit the examples it can see. Keeping some of them out of the prompt
            turns the rest of the set into a held-out test: the rule is accepted only if it
            generalises to data the model never saw, and that data is still on chain.
          </p>
        </article>
        <article className="card">
          <h2>Why execution, not agreement</h2>
          <p>
            Two runs of an LLM rarely produce the same text, so comparing proposals would stall
            consensus. Here the leader's rule is a deterministic artifact: validators can run it
            and get the same verdict on every node.
          </p>
        </article>
      </section>

      <section className="card">
        <h2>Limits</h2>
        <ul className="list">
          <li>Title 80 characters, description 400 characters.</li>
          <li>3 to 12 examples, at least 2 public and 1 private, no duplicate inputs.</li>
          <li>Each input and each output at most 300 characters; 4000 characters in total.</li>
          <li>Pattern and replacement at most 200 characters; flags only <code>i</code>, <code>m</code>, <code>s</code>.</li>
          <li>Nested quantifiers such as <code>(.+)+</code> are refused before they run.</li>
          <li>The registry holds at most 500 specs; <code>list_specs</code> returns the newest 50.</li>
          <li>
            <code>apply</code> takes at most 4000 characters of text.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>What this is not</h2>
        <p>
          There is no web fetching, no prose grading and no money here. A spec is a text
          transformation and nothing else: if a rule cannot be checked by running it over the
          examples, it does not belong in this registry.
        </p>
      </section>
    </div>
  )
}
