"use client";

import {
  useReadContract,
  useReadContracts,
} from "wagmi";

import type {
  ContractFunctionParameters,
} from "viem";

import {
  treasuryAbi,
  treasuryAddress,
} from "../../config/treasury";

type GetProposalContract = ContractFunctionParameters<
  typeof treasuryAbi,
  "view",
  "getProposal"
>;

// type Proposal = {
//   to: `0x${string}`;
//   value: bigint;
//   approvalCount: bigint;
//   data: `0x${string}`;
//   nonce: bigint;
//   executed: boolean;
// };

export function ProposalList() {
  const proposalCount = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "proposalCount",
    chainId: 11155111,
  });

  const count = proposalCount.data
    ? Number(proposalCount.data)
    : 0;

  const proposalIds = Array.from(
    { length: count },
    (_, index) => BigInt(index),
  );

  const proposalContracts: GetProposalContract[] =
    proposalIds.map((proposalId) => ({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: "getProposal",
      args: [proposalId],
    }));

  const proposals = useReadContracts({
    contracts: proposalContracts,
    query: {
      enabled:
        proposalCount.status === "success" &&
        count > 0,
    },
  });

  if (proposalCount.isLoading) {
    return <p>Loading proposal count...</p>;
  }

  if (proposalCount.error) {
    return <p>Failed to load proposal count.</p>;
  }

  if (count === 0) {
    return <p>No proposals found.</p>;
  }

  if (proposals.isLoading) {
    return <p>Loading proposals...</p>;
  }

  if (proposals.error) {
    return <p>Failed to load proposals.</p>;
  }

   return (
    <section className="proposal-section">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Transaction Queue</p>
          <h2>Proposals</h2>
        </div>

        <span className="proposal-count">
          {count} {count === 1 ? "proposal" : "proposals"}
        </span>
      </div>

      <div className="proposal-list">
        {proposals.data?.map((result, index) => {
          if (result.status !== "success") {
            return (
              <article
                className="proposal-card"
                key={index}
              >
                <div className="proposal-header">
                  <h3>Proposal #{index}</h3>

                  <span className="proposal-status proposal-status-error">
                    Error
                  </span>
                </div>

                <p className="proposal-error">
                  Failed to load proposal.
                </p>
              </article>
            );
          }
          const proposal = result.result;
          
          return (
            <article
              className={`proposal-card ${
                proposal.executed
                  ? "proposal-card-executed"
                  : ""
              }`}
              key={index}
            >
              <div className="proposal-header">
                <div>
                  <p className="proposal-label">
                    Proposal
                  </p>
                  <h3>#{index}</h3>
                </div>

                <span
                  className={`proposal-status ${
                    proposal.executed
                      ? "proposal-status-executed"
                      : "proposal-status-pending"
                  }`}
                >
                  {proposal.executed
                    ? "Executed"
                    : "Pending"}
                </span>
              </div>

              <div className="proposal-details">
                <div className="proposal-detail">
                  <span>Target</span>
                  <strong className="mono-value">
                    {proposal.to}
                  </strong>
                </div>

                <div className="proposal-detail">
                  <span>Value</span>
                  <strong>
                    {Number(proposal.value) / 1e18} ETH
                  </strong>
                </div>

                <div className="proposal-detail">
                  <span>Approvals</span>
                  <strong>
                    {proposal.approvalCount.toString()}
                  </strong>
                </div>

                <div className="proposal-detail">
                  <span>Nonce</span>
                  <strong>
                    {proposal.nonce.toString()}
                  </strong>
                </div>
              </div>

              <div className="proposal-data">
                <span>Calldata</span>

                <code>
                  {proposal.data === "0x"
                    ? "No calldata"
                    : proposal.data}
                </code>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}