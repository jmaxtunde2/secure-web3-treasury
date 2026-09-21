import { TreasuryInfo } from "./components/TreasuryInfo";
import { WalletConnect } from "./components/WalletConnect";
import { ProposalList } from "./components/ProposalList";
import { CreateProposal } from "./components/CreateProposal";
import { SignProposal } from "./components/SignProposal";

export default function Home() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ST</div>

          <div>
            <h1>Secure Treasury</h1>
            <p>Multisignature Web3 Treasury</p>
          </div>
        </div>

        <div className="environment">
          <span className="status-dot" />
          <span>Sepolia</span>
          <span className="network-id">Chain 11155111</span>
        </div>
      </header>

      <div className="dashboard">
        <section className="wallet-section">
          <WalletConnect />
        </section>

        <section className="page-intro">
          <div>
            <p className="eyebrow">Treasury Dashboard</p>
            <h2>Manage digital assets securely</h2>
            <p className="intro-text">
              Create, authorize, and execute treasury
              transactions using threshold signatures.
            </p>
          </div>
        </section>

        <section className="overview-grid">
          <TreasuryInfo />
        </section>

        <section className="content-card">
          <ProposalList />
        </section>

        <section className="action-grid">
          <div className="content-card">
            <SignProposal />
          </div>

          <div className="content-card">
            <CreateProposal />
          </div>
        </section>
      </div>

      <footer className="footer">
        <p>
          Secure Treasury · EIP-712 · ECDSA · 2-of-3
          authorization
        </p>
      </footer>
    </main>
  );
}