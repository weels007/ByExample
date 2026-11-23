export type CaseExample = {
  input: string
  output: string
  public: boolean
}

export type SpecResult = {
  pattern: string
  replacement: string
  flags: string
  passed: boolean[]
  created: number
}

export type Spec = {
  id: string
  title: string
  description: string
  creator: string
  created: number
  cases: CaseExample[]
  evaluated: boolean
  result?: SpecResult | null
}

export type SpecSummary = {
  id: string
  title: string
  creator: string
  evaluated: boolean
  case_count: number
  public_count: number
  private_count: number
  created: number
}

export const MAX_TITLE = 80
export const MAX_DESCRIPTION = 400
export const MIN_CASES = 3
export const MAX_CASES = 12
export const MAX_CASE_TEXT = 300
export const MAX_CASE_TOTAL = 4000
