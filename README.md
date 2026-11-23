# ByExample

Teach a text transformation with examples, not with a regular expression.

A creator publishes a spec — a title, a description and 3–12 `input → output` pairs — and marks
some of the pairs **private**. On `evaluate`, an LLM sees only the public pairs and proposes one
regex rule (`pattern`, `replacement`, `flags`). Validators never compare answers: they **run** the
leader's rule against **every** pair, private ones included, and agree only when all of them are
reproduced and the pattern is safe. The accepted rule is stored, and `apply(spec_id, text)` replays
it for anyone, for free.

Equivalence here is execution-based. The artifact is the rule, and the test is the example set.

---

## Status

- Contract: `contracts/by_example.py` — written, direct test suite in `tests/direct`.
- Integration suite: `tests/integration` (Studionet), gated live evaluation behind
  `BYEXAMPLE_LIVE_EVALUATION=1`.
- Frontend: React 18 + TypeScript + Vite, hash routes, static build.
- **Registry address: not set yet.** `REGISTRY_ADDRESS` in `src/lib/genlayer.ts` is intentionally
  empty, because an address is only worth hardcoding once the integration suite has actually
  deployed the contract. Until it is filled in, the UI shows a "registry not deployed" banner and
  disables reads and writes.

The direct suite was not executed in the environment this repository was written in (no Python or
Node runtime available there), so treat the first `pytest tests/direct -v` and `npm run build` as
the real check. Everything below is what the code is written to do.

---

## Why GenLayer

The rule is proposed by a language model, so no single machine can be trusted to decide whether it
is good. GenLayer lets the contract ask for the rule inside a non-deterministic block and then have
independent validators verify the *artifact* deterministically. Because the verification is a plain
`re.sub` over a fixed list of examples, every validator reaches the same verdict — no tolerance, no
second opinion, no comparison of prose.

---

## How it works

```
create_spec(title, description, cases)        # 3–12 pairs, ≥2 public, ≥1 private
        │
        │  cases stored as JSON in the registry; private pairs never leave the contract
        ▼
evaluate(spec_id)                             # creator only, once per spec
        │
        ├── leader_fn()   prompt = public pairs only  →  {"pattern","replacement","flags"}
        │                 validate, compile, run over ALL pairs
        │
        ├── validator_fn(leader_result)
        │                 compile the leader's pattern, run over ALL pairs,
        │                 agree only if every output matches and the rule is safe
        │
        ▼
   consensus → stored result { pattern, replacement, flags, passed[], created }
             or revert with a readable reason and nothing stored
        │
        ▼
apply(spec_id, text)                          # free view, deterministic re.sub
```

If a leader proposes nothing usable, it returns a rejection instead of raising. A validator agrees
with a rejection only when **its own** attempt also fails, so a lazy leader cannot silently kill an
evaluation that another node could have solved.

---

## Contract API

`contracts/by_example.py` is a Python Intelligent Contract with the pinned header

```
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
```

Storage is a `TreeMap[str, str]` of spec JSON plus a `u32` counter, and there is an explicit
`__init__`.

| Method | Kind | Notes |
| --- | --- | --- |
| `create_spec(title, description, cases_json) -> str` | write | Validates everything, stores the spec, returns `spec-000001`-style id. |
| `evaluate(spec_id)` | write | Creator only, once. Runs the leader/validator block above. |
| `get_spec(spec_id) -> str` | view | The whole spec as JSON, including cases. Reverts when unknown. |
| `get_result(spec_id) -> str` | view | `{pattern, replacement, flags, passed, created}` as JSON, or `""` before evaluation. |
| `apply(spec_id, text) -> str` | view | Deterministic `re.sub` with the stored rule. Reverts before evaluation. |
| `spec_count() -> u32` | view | Number of specs ever created. |
| `list_specs() -> str` | view | Newest first, at most 50, JSON summaries (`id`, `title`, `creator`, `evaluated`, `case_count`, `public_count`, `private_count`, `created`). |

`cases_json` is

```json
[{"input": "...", "output": "...", "public": true}]
```

---

## Security

- **Prompt injection.** Examples are labelled as untrusted data in the prompt and the model output
  is treated as data: only three keys are read, and the rule has to survive execution before it can
  be stored.
- **Private examples.** They are excluded from the prompt entirely. A model that fits the public
  pairs perfectly still fails if it does not generalise, and the failing example number is the only
  thing that leaks into the error message — never its content.
- **ReDoS.** Patterns with a quantifier stacked on a quantified group (`(...+)+`, `(...*)+`,
  `(...+)*`, `(...){2,}`) are refused before they run, and patterns are capped at 200 characters.
- **Bounded work.** 12 examples × 300 characters, a 200-character pattern, a 4000-character `apply`
  input, at most 500 specs.
- **One writer.** Only the creator can evaluate a spec, and only once, so nobody can overwrite an
  accepted rule.
- **Validator independence.** Validators never accept the leader's word: they re-derive the verdict
  by running the rule themselves.

---

## Frontend

React 18 + TypeScript + Vite, no environment variables, hash routes so the static build works on
Vercel without rewrites:

- `#/` — what ByExample is, why examples beat regex, the three steps.
- `#/workspace` — registry summary, latest specs, the "New spec" composer.
- `#/specs` — All / My specs / Pending tabs plus search.
- `#/specs/<id>` — examples with their public/private badge, the Evaluate button for the creator,
  the accepted rule with ✓/× per example (private ones included), and a "Try it" box that calls
  `apply`.
- `#/how-it-works` — the consensus flow and the limits.

Wallet discipline (`src/hooks/useWallet.ts`):

- `eth_accounts` is read silently on load; nothing pops up.
- `eth_requestAccounts` is single-flight; a `-32002` answer is shown, never retried.
- The chain is selected with `wallet_switchEthereumChain`, and `wallet_addEthereumChain` is used
  when the wallet answers `4902`.
- `client.connect()` is never called; the write client is built from the injected provider.
- Write timeouts: 360 s for `create_spec`, 600 s for `evaluate`.

To point the app at a registry, paste the address printed by the integration suite into
`REGISTRY_ADDRESS` in `src/lib/genlayer.ts`.

---

## Testing

```bash
pip install -r requirements-dev.txt

genvm-lint check contracts/by_example.py
pytest tests/direct -v
```

`tests/direct` uses `direct_deploy`, `direct_vm.mock_llm`, `direct_bob` / `direct_charlie` and
covers: input validation (title, description, case count, duplicates, lengths, total size), the
public/private minimums, creator-only and once-only evaluation, a rule that fails a private example,
a rule that does not compile, a nested quantifier, broken LLM JSON, validator agreement on a good
rule, validator refusal of a rule that only fits the public examples, validator refusal of a
malformed leader result, `apply` before and after evaluation, newest-first listing, and spec
independence.

Studionet (deploys one registry per session and prints its address):

```bash
KEYSTORE_1=... KEYSTORE_PASSWORD_1=... \
  gltest --network studionet tests/integration -v

# optional, costs a real LLM round trip:
BYEXAMPLE_LIVE_EVALUATION=1 gltest --network studionet tests/integration -v
```

The keystore loader accepts a Web3 keystore JSON, a base64-encoded keystore, or a raw private key.
`KEYSTORE_2` / `KEYSTORE_PASSWORD_2` are optional; without them the "outsider" test uses a fresh
random account.

---

## CI

- `.github/workflows/ci.yml` — `genvm-lint check`, `pytest tests/direct`, `npm run typecheck`,
  `npm run build`.
- `.github/workflows/integration.yml` — manual (`workflow_dispatch`) or triggered by a change to
  `.github/integration-request`; runs the Studionet suite and prints the deployed registry address
  at the end of the job and in the step summary.

---

## Vercel

The repository root is the Vite app: `vercel.json` builds `npm run build` into `dist`, `.nvmrc`
pins Node 20, and there are no environment variables. Import the repository, keep the detected
Vite settings, deploy.

---

## Limits

| What | Limit |
| --- | --- |
| Title | 80 characters |
| Description | 400 characters |
| Examples per spec | 3–12, at least 2 public and 1 private, no duplicate inputs |
| One example input / output | 300 characters each |
| All examples together | 4000 characters |
| Pattern / replacement | 200 characters each |
| Flags | only `i`, `m`, `s` |
| `apply` text | 4000 characters |
| Registry | 500 specs, `list_specs` returns the newest 50 |
