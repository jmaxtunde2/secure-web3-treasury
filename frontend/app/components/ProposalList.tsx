"use client";

import {
  useReadContract,
  useReadContracts,
} from "wagmi";

import {
  treasuryAbi,
  treasuryAddress,
} from "../../config/treasury";

export function ProposalList() {
  const proposalCount = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "proposalCount",
    chainId: 31337,
  });

  const count = proposalCount.data
    ? Number(proposalCount.data)
    : 0;

  const proposalIds = Array.from(
    { length: count },
    (_, index) => BigInt(index),
  );

  const proposals = useReadContracts({
    contracts: proposalIds.map((proposalId) => ({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: "getProposal",
      args: [proposalId],
      chainId: 31337,
    })),
    query: {
      enabled: proposalCount.status === "success" && count > 0,
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
    <section>
      <h2>Proposals</h2>

      <p>Total proposals: {count}</p>

      {proposals.data?.map((result, index) => {
        if (result.status !== "success") {
          return (
            <article key={index}>
              <h3>Proposal #{index}</h3>
              <p>Failed to load proposal.</p>
            </article>
          );
        }

        const proposal = result.result;

        return (
          <article key={index}>
            <h3>Proposal #{index}</h3>

            <p>Target: {proposal.to}</p>

            <p>
              Value: {proposal.value.toString()} wei
            </p>

            <p>
              Approval Count:{" "}
              {proposal.approvalCount.toString()}
            </p>

            <p>Data: {proposal.data}</p>

            <p>
              Nonce: {proposal.nonce.toString()}
            </p>

            <p>
              Executed:{" "}
              {proposal.executed ? "Yes" : "No"}
            </p>
          </article>
        );
      })}
    </section>
  );
}