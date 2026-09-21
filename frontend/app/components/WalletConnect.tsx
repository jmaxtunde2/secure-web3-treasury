"use client";

import { useEffect, useState } from "react";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

const SEPOLIA_CHAIN_ID = 11155111;

function shortenAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnect() {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const { switchChain, isPending: isSwitching } = useSwitchChain();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSepolia = chain?.id === SEPOLIA_CHAIN_ID;

  async function copyAddress() {
    if (!address) return;

    await navigator.clipboard.writeText(address);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  /*
   * During SSR and the first client render, avoid rendering
   * wallet-dependent UI. This prevents hydration mismatches.
   */
  if (!mounted) {
    return (
      <section className="wallet-card wallet-loading">
        <div className="wallet-heading">
          <div>
            <p className="section-label">Wallet</p>
            <h2>Connect your wallet</h2>
          </div>

          <span className="wallet-status">
            Loading
          </span>
        </div>

        <p className="wallet-description">
          Connecting to the treasury dashboard...
        </p>
      </section>
    );
  }

  if (isConnected && address) {
    return (
      <section className="wallet-card">
        <div className="wallet-heading">
          <div>
            <p className="section-label">Wallet</p>
            <h2>Connected</h2>
          </div>

          <span
            className={`wallet-status ${
              isSepolia
                ? "wallet-status-success"
                : "wallet-status-warning"
            }`}
          >
            <span className="status-dot" />
            {isSepolia ? "Sepolia" : "Wrong network"}
          </span>
        </div>

        <div className="wallet-address-row">
          <div className="wallet-avatar">
            {address.slice(2, 4).toUpperCase()}
          </div>

          <div className="wallet-address">
            <span className="wallet-address-label">
              Connected account
            </span>

            <strong>{shortenAddress(address)}</strong>
          </div>

          <button
            type="button"
            className="wallet-copy-button"
            onClick={copyAddress}
            title="Copy wallet address"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {!isSepolia && (
          <div className="wallet-warning">
              <div>
                <strong>Wrong network</strong>
                <span>
                  This treasury is deployed on Ethereum Sepolia.
                </span>
              </div>

              <button
                type="button"
                className="wallet-switch-button"
                onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
                disabled={isSwitching}
              >
                {isSwitching ? "Switching..." : "Switch to Sepolia"}
              </button>
            </div>
        )}

        <div className="wallet-footer">
          <span>
            Network:{" "}
            <strong>{chain?.name ?? "Unknown"}</strong>
          </span>

          <button
            type="button"
            className="wallet-disconnect"
            onClick={() => disconnect()}
          >
            Disconnect
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="wallet-card">
      <div className="wallet-heading">
        <div>
          <p className="section-label">Wallet</p>
          <h2>Connect your wallet</h2>
        </div>

        <span className="wallet-status wallet-status-neutral">
          Not connected
        </span>
      </div>

      <p className="wallet-description">
        Connect your Web3 wallet to authorize and execute
        treasury transactions.
      </p>

      <div className="wallet-connectors">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            type="button"
            className="wallet-connect-button"
            onClick={() => connect({ connector })}
            disabled={isPending}
          >
            <span className="wallet-button-icon">
              ◈
            </span>

            <span>
              {isPending
                ? "Connecting..."
                : `Connect ${connector.name}`}
            </span>
          </button>
        ))}
      </div>

      <p className="wallet-network-note">
        Supported network: <strong>Ethereum Sepolia</strong>
      </p>
    </section>
  );
}