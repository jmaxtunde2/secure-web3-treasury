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
    chainId: 31337,
  });

  const signers = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "getSigner",
    chainId: 31337,
  });

  const proposalCount = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "proposalCount",
    chainId: 31337,
  });

  const balance = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "treasuryBalance",
    chainId: 31337,
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
    <section>
      <h2>Secure Treasury</h2>

      <p>
        Threshold: {threshold.data?.toString()}
      </p>

      <h3>Signers</h3>

      <ul>
        {signers.data?.map((signer) => (
          <li key={signer}>{signer}</li>
        ))}
      </ul>

      <p>
        Proposal Count:{" "}
        {proposalCount.data?.toString()}
      </p>

      <p>
        Treasury Balance:{" "}
        {balance.data?.toString()} wei
      </p>

      <p>
        Signer status:{" "}
        {isTreasurySigner
          ? "Treasury signer"
          : "Not a treasury signer"}
      </p>
    </section>
  );
}