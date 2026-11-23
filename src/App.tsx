import type { ReactNode } from 'react'

import { Layout } from './components/Layout'
import { useHashRoute } from './hooks/useHashRoute'
import { useWallet } from './hooks/useWallet'
import { HowItWorks } from './pages/HowItWorks'
import { Landing } from './pages/Landing'
import { SpecDetail } from './pages/SpecDetail'
import { Specs } from './pages/Specs'
import { Workspace } from './pages/Workspace'

function NotFound() {
  return (
    <div className="page">
      <div className="card empty">
        <h1>Nothing at this route</h1>
        <p className="muted">The page may have moved.</p>
        <a className="btn btn-primary" href="#/">
          Back to the start
        </a>
      </div>
    </div>
  )
}

export default function App() {
  const route = useHashRoute()
  const wallet = useWallet()

  let page: ReactNode
  if (route === '/') {
    page = <Landing />
  } else if (route === '/workspace') {
    page = <Workspace wallet={wallet} />
  } else if (route === '/specs') {
    page = <Specs wallet={wallet} />
  } else if (route.startsWith('/specs/') && route.length > '/specs/'.length) {
    page = <SpecDetail specId={route.slice('/specs/'.length)} wallet={wallet} />
  } else if (route === '/how-it-works') {
    page = <HowItWorks />
  } else {
    page = <NotFound />
  }

  return (
    <Layout route={route} wallet={wallet}>
      {page}
    </Layout>
  )
}
