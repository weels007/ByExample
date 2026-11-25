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

function BrandMark() {
  return (
    <span className="brand-mark">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <defs>
          <linearGradient id="byexample-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b7a8ff" />
            <stop offset="55%" stopColor="#8b7bff" />
            <stop offset="100%" stopColor="#38e8d0" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#byexample-mark)" />
        <path
          d="M8 11h8M8 16h8M8 21h6"
          stroke="#0a0714"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M18.5 12.4 22.6 16l-4.1 3.6"
          fill="none"
          stroke="#0a0714"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function Layout({ route, wallet, children }: LayoutProps) {
  const isActive = (path: string) =>
    path === '/' ? route === '/' : route === path || route.startsWith(path + '/')

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="#/">
          <BrandMark />
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
              className="btn btn-ghost btn-small mono"
              onClick={wallet.disconnect}
              title="Forget this wallet in the page"
            >
              {shortAddress(wallet.address)}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-small"
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
        <span>
          ByExample — examples in, one verified rule out. Built on GenLayer's Intelligent Contracts.
        </span>
        <span className="mono">
          {IS_REGISTRY_CONFIGURED ? shortAddress(REGISTRY_ADDRESS) : 'registry not set'}
        </span>
      </footer>
    </div>
  )
}
