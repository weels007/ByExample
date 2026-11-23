# ByExample — submission

## Copy-ready fields

**Name:** ByExample

**Tagline:** Teach a text rule with examples, not with a regex.

**One-liner:** Publish 3–12 input → output examples; an LLM proposes one regex, validators execute
it against every example — private ones included — and only then is the rule stored.

**Category:** Developer tooling · text processing · execution-verified artifacts

**Repository:** this repository (`contracts/by_example.py`, `src/`, `tests/`)

**Live app:** the Vercel deployment of this repository (static Vite build, no env vars)

**Contract:** `contracts/by_example.py` — deployed on Studionet at
`0x4Ba4d2aa82043912BA51B0FA7C8F2c0a5bCdFdF4` (deployed by the integration workflow, which prints
the address again on every run as `[integration] registry 0x...`).

---

## How it works

1. **A spec is a test set.** The creator writes a title, a description and 3–12 examples and marks
   some of them private. Everything is validated on chain: counts, lengths, duplicate inputs, at
   least two public and one private example.
2. **The model only sees the public half.** `evaluate` opens a non-deterministic block, builds a
   prompt from the public examples only, and asks for
   `{"pattern", "replacement", "flags"}` as JSON.
3. **The artifact is the rule, not the answer.** The leader compiles its own proposal and runs it
   over all examples. Validators do not compare proposals — they compile the leader's pattern and
   run it over the same set, private examples included. They agree only if every output matches,
   the pattern and replacement are at most 200 characters, the flags come from `{i, m, s}`, and the
   pattern has no stacked quantifier.
4. **Store or revert.** Consensus on a good rule stores `{pattern, replacement, flags, passed[],
   created}`. Anything else reverts with a readable reason and stores nothing; the spec stays
   pending and can be evaluated again.
5. **`apply` is free.** The stored rule is replayed as a deterministic `re.sub` in a read-only view,
   so the spec becomes a public, verified text cleaner.

Why GenLayer: the proposal is non-deterministic but the verdict is not. Validators reach agreement
by executing the same rule over the same examples, so equivalence is decided by behaviour instead
of by comparing model output.

---

## How to use, start to finish

1. Open the app and connect a wallet; approve switching to the GenLayer network if asked.
2. Go to **Workspace → New spec**.
3. Give it a title and a description, then fill in the examples. Example: `Hello world!` →
   `Hello world`, `Ship it!` → `Ship it`, and a private `Done!!` → `Done`.
4. Mark at least two examples public and at least one private, then **Publish spec**.
5. Open the spec and press **Evaluate this spec** (only the creator sees this). Wait for the
   transaction to settle.
6. When it is accepted you get the rule (`pattern`, `replacement`, `flags`), a ✓ or × per example —
   private ones included — and the **Try it** box, which calls `apply(spec_id, text)` with no
   wallet involved.
7. Share the spec id. Anyone can browse it under **Specs** and apply it.

---

## Expected outcome

ByExample turns a handful of input/output examples into one verified text transformation rule. A
creator publishes 3–12 pairs and marks some private; the model only sees the public ones and
proposes a single regex, replacement and flags. Validators never compare answers — they run that
regex over every pair, private ones included, and agree only if all of them are reproduced and the
pattern is safe. The accepted rule is stored on GenLayer, and anyone can call
`apply(spec_id, text)` as a free read-only view.

---

## Troubleshooting

**"The registry is not deployed yet" banner.** `REGISTRY_ADDRESS` in `src/lib/genlayer.ts` is still
empty. Run the integration workflow, copy the printed address, paste it in, rebuild.

**Connect does nothing.** No injected wallet was found, or a previous request is still open in the
wallet. Open the wallet, finish or reject the pending request, then reload the page. A `-32002`
error is never retried on purpose.

**"Your wallet does not know this network yet."** Approve the add-network prompt; the app sends
`wallet_addEthereumChain` when the wallet answers `4902`, then switches again.

**Evaluation ends with "No rule was stored".** The model did not find a pattern that reproduces
every example, including the private ones. Make the examples more consistent (one transformation,
no exceptions), or mark the odd one out private/public accordingly, then evaluate again — a
rejected evaluation stores nothing, so the spec is still pending.

**Evaluation hangs for a minute.** That is normal: one LLM round trip plus consensus. The app waits
up to 600 s for `evaluate` and 360 s for `create_spec`.

**`pytest tests/direct` cannot find the contract.** Run it from the repository root; the direct
runner resolves `contracts/by_example.py` from there.

**`genvm-lint` fails to download the SDK.** It caches under `~/.cache/genvm-linter`; re-run once
with network access.
