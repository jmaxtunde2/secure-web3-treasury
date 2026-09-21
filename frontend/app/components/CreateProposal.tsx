"use client";

import { useState } from "react";
import {
  isAddress,
  isHex,
} from "viem";
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
  const [validationError, setValidationError] =
    useState("");

  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
  });

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setValidationError("");

    if (!isConnected || !address) {
      return;
    }

    if (!isAddress(target)) {
      setValidationError(
        "Enter a valid Ethereum address.",
      );
      return;
    }

    if (!/^\d+$/.test(value)) {
      setValidationError(
        "Value must be a valid whole number in wei.",
      );
      return;
    }

    if (!isHex(data)) {
      setValidationError(
        "Calldata must be valid hexadecimal starting with 0x.",
      );
      return;
    }

    writeContract({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: "createProposal",
      chainId: 11155111,
      args: [
        target as `0x${string}`,
        BigInt(value),
        data as `0x${string}`,
      ],
    });
  }

  const isBusy = isPending || isConfirming;

  return (
    <section className="create-proposal">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">
            Treasury Action
          </p>
          <h2>Create Proposal</h2>
        </div>
      </div>

      <p className="form-description">
        Create a transaction proposal for Treasury signers
        to authorize and execute.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="target">
            Target address
          </label>

          <input
            id="target"
            type="text"
            value={target}
            onChange={(event) =>
              setTarget(event.target.value)
            }
            placeholder="0x..."
            autoComplete="off"
            required
          />

          <small>
            Contract or wallet that will receive the call.
          </small>
        </div>

        <div className="form-field">
          <label htmlFor="value">
            Value <span>wei</span>
          </label>

          <input
            id="value"
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(event) =>
              setValue(event.target.value)
            }
            required
          />

          <small>
            Native ETH amount sent with the transaction.
          </small>
        </div>

        <div className="form-field">
          <label htmlFor="data">Calldata</label>

          <textarea
            id="data"
            value={data}
            onChange={(event) =>
              setData(event.target.value)
            }
            placeholder="0x"
            rows={3}
            required
          />

          <small>
            ABI-encoded function call. Use <code>0x</code>{" "}
            for a plain ETH transfer.
          </small>
        </div>

        {validationError && (
          <div className="form-message form-message-error">
            {validationError}
          </div>
        )}

        <button
          className="primary-action"
          type="submit"
          disabled={!isConnected || isBusy}
        >
          {isPending
            ? "Confirm in wallet..."
            : isConfirming
              ? "Confirming..."
              : "Create Proposal"}
        </button>
      </form>

      {!isConnected && (
        <div className="form-message form-message-muted">
          Connect a wallet to create a proposal.
        </div>
      )}

      {hash && (
        <div className="transaction-result">
          <span>Transaction submitted</span>
          <code>
            {hash.slice(0, 10)}...{hash.slice(-8)}
          </code>
        </div>
      )}

      {isConfirmed && (
        <div className="form-message form-message-success">
          Proposal transaction confirmed successfully.
        </div>
      )}

      {error && (
        <div className="form-message form-message-error">
          Transaction failed.
          <small>{error.message}</small>
        </div>
      )}
    </section>
  );
}