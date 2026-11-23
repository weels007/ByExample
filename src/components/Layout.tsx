import type { ReactNode } from 'react'

import type { Wallet } from '../hooks/useWallet'
import { shortAddress } from '../lib/format'
import { IS_REGISTRY_CONFIGURED, REGISTRY_ADDRESS } from '../lib/genlayer'

const NAV = [
  { path: '/', label: 'Home' },
  { path: '/workspace', label: 'Workspace' },
  { path: '/specs', label: 'Specs' },
  { path: '/how-it-works', label: 'How it works' },
]

type LayoutProps = {
  route: string
  wallet: Wallet
  children: ReactNode
}

export function Layout({ route, wallet, children }: LayoutProps) {
  const isActive = (path: string) =>
    path === '/' ? route === '/' : route === path || route.startsWith(path + '/')

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="#/">
          <span className="brand-mark">::</span>
          <span className="brand-name">ByExample</span>
        </a>

        <nav className="nav">
          {NAV.map((item) => (
            <a
              key={item.path}
              href={'#' + item.path}
              className={isActive(item.path) ? 'nav-link nav-link-active' : 'nav-link'}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-right">
          {wallet.address ? (
            <button
              type="button"
              className="btn btn-ghost mono"
              onClick={wallet.disconnect}
              title="Forget this wallet in the page"
            >
              {shortAddress(wallet.address)}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void wallet.connect()}
              disabled={wallet.connecting}
            >
              {wallet.connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          )}
        </div>
      </header>

      {wallet.error ? (
        <div className="banner banner-warn">
          <span>{wallet.error}</span>
          <button type="button" className="banner-close" onClick={wallet.clearError}>
            Dismiss
          </button>
        </div>
      ) : null}

      {!IS_REGISTRY_CONFIGURED ? (
        <div className="banner">
          <span>
            The registry is not deployed yet, so reads are off. Run the integration suite and paste the
            address it prints into <code>REGISTRY_ADDRESS</code> in <code>src/lib/genlayer.ts</code>.
          </span>
        </div>
      ) : null}

      <main className="main">{children}</main>

      <footer className="footer">
        <span>ByExample · an Intelligent Contract on GenLayer</span>
        <span className="mono">
          {IS_REGISTRY_CONFIGURED ? shortAddress(REGISTRY_ADDRESS) : 'registry not set'}
        </span>
      </footer>
    </div>
  )
}
