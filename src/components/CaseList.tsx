import { Badge } from './Badge'
import { visibleWhitespace } from '../lib/format'
import type { CaseExample } from '../lib/types'

type CaseListProps = {
  cases: CaseExample[]
  passed?: boolean[]
}

export function CaseList({ cases, passed }: CaseListProps) {
  return (
    <ul className="case-list">
      {cases.map((item, index) => {
        const verdict = passed ? passed[index] : undefined
        return (
          <li key={index} className="case">
            <div className="case-head">
              <span className="case-index">#{index + 1}</span>
              <Badge tone={item.public ? 'public' : 'private'}>
                {item.public ? 'public' : 'private'}
              </Badge>
              {typeof verdict === 'boolean' ? (
                <span className={verdict ? 'mark mark-ok' : 'mark mark-bad'}>
                  {verdict ? '✓' : '×'}
                </span>
              ) : null}
            </div>

            <div className="case-body">
              <div className="case-line">
                <span className="case-label">in</span>
                <code>{visibleWhitespace(item.input)}</code>
              </div>
              <div className="case-line">
                <span className="case-label">out</span>
                <code>{visibleWhitespace(item.output) || '∅'}</code>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
