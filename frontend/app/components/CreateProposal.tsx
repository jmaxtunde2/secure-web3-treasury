"use client";

import { useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import {
  treasuryAbi,
  treasuryAddress,
} from "../../config/treasury";

export function CreateProposal() {
  const { address, isConnected } = useAccount();

  const [target, setTarget] = useState("");
  const [value, setValue] = useState("0");
  const [data, setData] = useState("0x");

  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConnected || !address) {
      return;
    }

    writeContract({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: "createProposal",
      chainId: 31337,
      args: [
        target as `0x${string}`,
        BigInt(value),
        data as `0x${string}`,
      ],
    });
  }

  return (
    <section>
      <h2>Create Proposal</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="target">Target address</label>
          <input
            id="target"
            type="text"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="0x..."
            required
          />
        </div>

        <div>
          <label htmlFor="value">Value (wei)</label>
          <input
            id="value"
            type="number"
            min="0"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="data">Calldata</label>
          <input
            id="data"
            type="text"
            value={data}
            onChange={(event) => setData(event.target.value)}
            placeholder="0x"
            required
          />
        </div>

        <button
          type="submit"
          disabled={!isConnected || isPending || isConfirming}
        >
          {isPending
            ? "Confirm in wallet..."
            : isConfirming
              ? "Confirming..."
              : "Create Proposal"}
        </button>
      </form>

      {!isConnected && (
        <p>Connect a wallet to create a proposal.</p>
      )}

      {hash && (
        <p>Transaction: {hash}</p>
      )}

      {isConfirmed && (
        <p>Proposal transaction confirmed.</p>
      )}

      {error && (
        <p>Transaction failed: {error.message}</p>
      )}
    </section>
  );
}