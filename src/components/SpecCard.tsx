import { Badge } from './Badge'
import { shortAddress } from '../lib/format'
import type { SpecSummary } from '../lib/types'

export function SpecCard({ spec }: { spec: SpecSummary }) {
  return (
    <a className="card spec-card" href={'#/specs/' + spec.id}>
      <div className="spec-card-head">
        <h3>{spec.title}</h3>
        <Badge tone={spec.evaluated ? 'ok' : 'pending'}>
          {spec.evaluated ? 'verified' : 'pending'}
        </Badge>
      </div>

      <div className="spec-card-meta">
        <span>{spec.case_count} examples</span>
        <span>{spec.public_count} public</span>
        <span>{spec.private_count} private</span>
      </div>

      <div className="spec-card-foot">
        <span className="mono">{spec.id}</span>
        <span className="mono">{shortAddress(spec.creator)}</span>
      </div>
    </a>
  )
}
