"use client";

import { useReadContract, useAccount } from "wagmi";
import {
  treasuryAbi,
  treasuryAddress,
} from "../../config/treasury";

export function TreasuryInfo() {
  const { address } = useAccount();

  const threshold = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "threshold",
    chainId: 11155111,
  });

  const signers = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "getSigner",
    chainId: 11155111,
  });

  const proposalCount = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "proposalCount",
    chainId: 11155111,
  });

  const balance = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "treasuryBalance",
    chainId: 11155111,
  });

  if (
    threshold.isLoading ||
    signers.isLoading ||
    proposalCount.isLoading ||
    balance.isLoading
  ) {
    return <p>Loading treasury...</p>;
  }

  if (
    threshold.error ||
    signers.error ||
    proposalCount.error ||
    balance.error
  ) {
    return <p>Failed to load treasury.</p>;
  }

  const isTreasurySigner =
    address !== undefined &&
    signers.data?.some(
      (signer) =>
        signer.toLowerCase() === address.toLowerCase(),
    );

    return (
    <section className="treasury-overview">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Treasury Overview</p>
          <h2>Secure Treasury</h2>
        </div>

        <span className="live-badge">
          <span className="status-dot" />
          Live
        </span>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Authorization</span>
          <strong className="stat-value">
            {threshold.data?.toString()} of{" "}
            {signers.data?.length ?? 0}
          </strong>
          <span className="stat-description">
            Signatures required
          </span>
        </article>

        <article className="stat-card">
          <span className="stat-label">Signers</span>
          <strong className="stat-value">
            {signers.data?.length ?? 0}
          </strong>
          <span className="stat-description">
            Authorized treasury accounts
          </span>
        </article>

        <article className="stat-card">
          <span className="stat-label">Proposals</span>
          <strong className="stat-value">
            {proposalCount.data?.toString()}
          </strong>
          <span className="stat-description">
            Transactions created
          </span>
        </article>

        <article className="stat-card">
          <span className="stat-label">Balance</span>
          <strong className="stat-value">
            {balance.data !== undefined
              ? Number(balance.data) / 1e18
              : 0}{" "}
            ETH
          </strong>
          <span className="stat-description">
            Native treasury balance
          </span>
        </article>
      </div>

      <div className="signer-status">
        <div>
          <span className="stat-label">Connected wallet</span>
          <p>
            {address
              ? `${address.slice(0, 6)}...${address.slice(-4)}`
              : "No wallet connected"}
          </p>
        </div>

        <span
          className={
            isTreasurySigner
              ? "signer-badge signer-badge-active"
              : "signer-badge"
          }
        >
          {isTreasurySigner
            ? "Authorized signer"
            : "Not a treasury signer"}
        </span>
      </div>

      <div className="signer-list">
        <div className="section-heading compact">
          <div>
            <p className="section-eyebrow">Authorization Set</p>
            <h3>Treasury Signers</h3>
          </div>
        </div>

        <div className="signer-list-items">
          {signers.data?.map((signer, index) => {
            const isCurrentWallet =
              address !== undefined &&
              signer.toLowerCase() === address.toLowerCase();

            return (
              <div className="signer-row" key={signer}>
                <div className="signer-index">
                  {index + 1}
                </div>

                <div className="signer-address">
                  <span>{signer}</span>
                  {isCurrentWallet && (
                    <small>Connected wallet</small>
                  )}
                </div>

                <span className="authorized-label">
                  Authorized
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}