"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  formatEther,
  recoverTypedDataAddress,
} from "viem";

import {
  useAccount,
  useReadContract,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import {
  treasuryAbi,
  treasuryAddress,
} from "../../config/treasury";

const SEPOLIA_CHAIN_ID = 11155111;
const REQUIRED_SIGNATURES = 2;

type ProposalSignature = {
  signer: `0x${string}`;
  signature: `0x${string}`;
};

export function SignProposal() {
  const queryClient = useQueryClient();

  const [mounted, setMounted] = useState(false);
  const [selectedProposalId, setSelectedProposalId] =
    useState<number | null>(null);

  const [signatures, setSignatures] = useState<
    ProposalSignature[]
  >([]);

  const [recoveredSigners, setRecoveredSigners] =
    useState<Record<string, `0x${string}`>>({});

  const { address, isConnected } = useAccount();

  const {
    signTypedDataAsync,
    isPending,
    error: signError,
  } = useSignTypedData();

  /*
   * Load the number of proposals from the Treasury.
   *
   * This is the source of truth for which proposal IDs exist.
   */
  const proposalCount = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "proposalCount",
    chainId: SEPOLIA_CHAIN_ID,
  });

  /*
   * Load authorized Treasury signers.
   */
  const signers = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "getSigner",
    chainId: SEPOLIA_CHAIN_ID,
  });

  /*
   * Load the currently selected proposal.
   *
   * The query is disabled when no proposal exists or no proposal
   * has been selected.
   */
  const proposal = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "getProposal",
    args: [
      selectedProposalId !== null
        ? BigInt(selectedProposalId)
        : 0n,
    ],
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: selectedProposalId !== null,
    },
  });

  /*
   * Execute the selected proposal.
   */
  const {
    writeContract: executeProposal,
    data: executionHash,
    isPending: isExecuting,
    error: executionError,
  } = useWriteContract();

  const {
    isLoading: isConfirmingExecution,
    isSuccess: isExecutionConfirmed,
  } = useWaitForTransactionReceipt({
    hash: executionHash,
  });

  /*
   * Prevent server/client hydration differences.
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /*
   * Automatically select the first proposal when proposals exist.
   *
   * If there are no proposals, clear the selection.
   */
  useEffect(() => {
    if (proposalCount.data === undefined) {
      return;
    }

    const count = Number(proposalCount.data);

    setSelectedProposalId((current) => {
      if (count === 0) {
        return null;
      }

      if (current === null || current >= count) {
        return 0;
      }

      return current;
    });
  }, [proposalCount.data]);

  /*
   * Reset locally collected signatures whenever the selected
   * proposal changes.
   *
   * Signatures belong to a specific proposal digest and must
   * never be reused for another proposal.
   */
  useEffect(() => {
    setSignatures([]);
    setRecoveredSigners({});
  }, [selectedProposalId]);

  /*
   * Refresh contract reads after successful execution.
   */
  useEffect(() => {
    if (!isExecutionConfirmed) {
      return;
    }

    queryClient.invalidateQueries();
  }, [
    isExecutionConfirmed,
    queryClient,
  ]);

  /*
   * Recover the signer locally from an EIP-712 signature.
   *
   * This is frontend verification only.
   * SecureTreasury independently validates the signatures
   * inside execute().
   */
  async function recoverSignature(
    signature: `0x${string}`,
    proposalData: NonNullable<typeof proposal.data>,
  ) {
    return recoverTypedDataAddress({
      domain: {
        name: "SecureTreasury",
        version: "1",
        chainId: SEPOLIA_CHAIN_ID,
        verifyingContract: treasuryAddress,
      },

      types: {
        Transaction: [
          {
            name: "to",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "data",
            type: "bytes",
          },
          {
            name: "nonce",
            type: "uint256",
          },
        ],
      },

      primaryType: "Transaction",

      message: {
        to: proposalData.to,
        value: proposalData.value,
        data: proposalData.data,
        nonce: proposalData.nonce,
      },

      signature,
    });
  }

  /*
   * Check whether the connected wallet is one of the
   * authorized Treasury signers.
   */
  const isConnectedSigner =
    address !== undefined &&
    signers.data?.some(
      (treasurySigner) =>
        treasurySigner.toLowerCase() ===
        address.toLowerCase(),
    ) === true;

  /*
   * Request an EIP-712 signature from the connected wallet.
   */
  async function handleSign() {
    if (
      !isConnected ||
      !address ||
      !proposal.data ||
      !isConnectedSigner
    ) {
      return;
    }

    try {
      const newSignature =
        await signTypedDataAsync({
          domain: {
            name: "SecureTreasury",
            version: "1",
            chainId: SEPOLIA_CHAIN_ID,
            verifyingContract: treasuryAddress,
          },

          types: {
            Transaction: [
              {
                name: "to",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "data",
                type: "bytes",
              },
              {
                name: "nonce",
                type: "uint256",
              },
            ],
          },

          primaryType: "Transaction",

          message: {
            to: proposal.data.to,
            value: proposal.data.value,
            data: proposal.data.data,
            nonce: proposal.data.nonce,
          },
        });

      /*
       * Prevent the same wallet from being collected twice.
       */
      const alreadySigned = signatures.some(
        (item) =>
          item.signer.toLowerCase() ===
          address.toLowerCase(),
      );

      if (alreadySigned) {
        return;
      }

      /*
       * Immediately recover the signer locally.
       */
      const recoveredSigner =
        await recoverSignature(
          newSignature,
          proposal.data,
        );

      /*
       * Store the signature.
       */
      setSignatures((current) => [
        ...current,
        {
          signer: address,
          signature: newSignature,
        },
      ]);

      /*
       * Store the cryptographically recovered address.
       */
      setRecoveredSigners((current) => ({
        ...current,
        [newSignature]: recoveredSigner,
      }));
    } catch {
      /*
       * Signing errors are exposed through signError.
       */
    }
  }

  /*
   * Verify every collected signature against
   * the Treasury's authorized signer set.
   */
  const verifiedSignatures = signatures.map(
    (item) => {
      const recoveredSigner =
        recoveredSigners[item.signature];

      const isTreasurySigner =
        recoveredSigner !== undefined &&
        signers.data?.some(
          (treasurySigner) =>
            treasurySigner.toLowerCase() ===
            recoveredSigner.toLowerCase(),
        ) === true;

      return {
        ...item,
        recoveredSigner,
        isTreasurySigner,
      };
    },
  );

  /*
   * Keep only signatures from authorized signers.
   */
  const validSignatures =
    verifiedSignatures.filter(
      (item) => item.isTreasurySigner,
    );

  /*
   * Count distinct authorized signers.
   */
  const uniqueValidSigners = new Set(
    validSignatures.map((item) =>
      item.recoveredSigner?.toLowerCase(),
    ),
  );

  /*
   * Frontend pre-flight threshold check.
   *
   * The Solidity contract independently performs the same
   * authorization check during execute().
   */
  const hasValidThreshold =
    validSignatures.length >= REQUIRED_SIGNATURES &&
    uniqueValidSigners.size >= REQUIRED_SIGNATURES;

  /*
   * Execute the currently selected proposal.
   */
  function handleExecute() {
    if (
      selectedProposalId === null ||
      !hasValidThreshold
    ) {
      return;
    }

    executeProposal({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: "execute",
      chainId: SEPOLIA_CHAIN_ID,
      args: [
        BigInt(selectedProposalId),
        signatures.map(
          (item) => item.signature,
        ),
      ],
    });
  }

  /*
   * IMPORTANT:
   * Server and first client render must produce
   * identical output.
   */
  if (!mounted || !isConnected) {
    return (
      <section className="sign-proposal">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              Authorization
            </p>
            <h2>Sign Proposal</h2>
          </div>
        </div>

        <p className="form-message form-message-muted">
          Connect a wallet to sign a proposal.
        </p>
      </section>
    );
  }

  /*
   * Proposal count loading state.
   */
  if (proposalCount.isLoading) {
    return (
      <section className="sign-proposal">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              Authorization
            </p>
            <h2>Sign Proposal</h2>
          </div>
        </div>

        <p className="form-message form-message-muted">
          Loading proposals...
        </p>
      </section>
    );
  }

  /*
   * Proposal count error.
   */
  if (proposalCount.error) {
    return (
      <section className="sign-proposal">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              Authorization
            </p>
            <h2>Sign Proposal</h2>
          </div>
        </div>

        <p className="form-message form-message-error">
          Failed to load proposals.
          <small>
            {proposalCount.error.message}
          </small>
        </p>
      </section>
    );
  }

  const count = Number(
    proposalCount.data ?? 0n,
  );

  /*
   * Empty state: no proposals exist.
   */
  if (count === 0) {
    return (
      <section className="sign-proposal">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              Authorization
            </p>
            <h2>Sign Proposal</h2>
          </div>

          <span className="proposal-status proposal-status-pending">
            No proposals
          </span>
        </div>

        <div className="empty-state">
          <strong>No proposals available.</strong>
          <p>
            Create a treasury proposal first. Once a
            proposal exists, authorized Treasury signers
            can review, sign, and execute it.
          </p>
        </div>
      </section>
    );
  }

  /*
   * Selected proposal loading state.
   */
  if (
    selectedProposalId === null ||
    proposal.isLoading
  ) {
    return (
      <section className="sign-proposal">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              Authorization
            </p>
            <h2>Sign Proposal</h2>
          </div>
        </div>

        <p className="form-message form-message-muted">
          Loading selected proposal...
        </p>
      </section>
    );
  }

  /*
   * Selected proposal error.
   */
  if (proposal.error) {
    return (
      <section className="sign-proposal">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              Authorization
            </p>
            <h2>Sign Proposal</h2>
          </div>
        </div>

        <p className="form-message form-message-error">
          Failed to load Proposal #
          {selectedProposalId}.
          <small>
            {proposal.error.message}
          </small>
        </p>
      </section>
    );
  }

  /*
   * Proposal should exist at this point.
   */
  if (!proposal.data) {
    return (
      <section className="sign-proposal">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              Authorization
            </p>
            <h2>Sign Proposal</h2>
          </div>
        </div>

        <p className="form-message form-message-muted">
          Proposal #{selectedProposalId} was not found.
        </p>
      </section>
    );
  }

  const proposalExecuted =
    proposal.data.executed;

  return (
    <section className="sign-proposal">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">
            Authorization
          </p>
          <h2>
            Sign Proposal #{selectedProposalId}
          </h2>
        </div>

        <span
          className={`proposal-status ${
            proposalExecuted
              ? "proposal-status-executed"
              : "proposal-status-pending"
          }`}
        >
          {proposalExecuted
            ? "Executed"
            : "Awaiting signatures"}
        </span>
      </div>

      {count > 1 && (
        <div className="proposal-selector">
          <label htmlFor="proposal-select">
            Select proposal
          </label>

          <select
            id="proposal-select"
            value={selectedProposalId}
            onChange={(event) =>
              setSelectedProposalId(
                Number(event.target.value),
              )
            }
          >
            {Array.from(
              { length: count },
              (_, index) => (
                <option
                  key={index}
                  value={index}
                >
                  Proposal #{index}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      <div className="sign-proposal-details">
        <div className="proposal-detail">
          <span>Target</span>
          <strong className="mono-value">
            {proposal.data.to}
          </strong>
        </div>

        <div className="proposal-detail">
          <span>Value</span>
          <strong>
            {formatEther(proposal.data.value)} ETH
          </strong>
        </div>

        <div className="proposal-detail">
          <span>Nonce</span>
          <strong>
            {proposal.data.nonce.toString()}
          </strong>
        </div>

        <div className="proposal-data">
          <span>Calldata</span>
          <code>
            {proposal.data.data === "0x"
              ? "No calldata"
              : proposal.data.data}
          </code>
        </div>
      </div>

      {!isConnectedSigner && (
        <div className="form-message form-message-muted">
          <strong>Connected wallet is not a Treasury signer.</strong>
          <small>
            Only one of the authorized Treasury signers can
            provide a valid signature for this proposal.
          </small>
        </div>
      )}

      <div className="sign-action">
        <button
          className="primary-action"
          onClick={handleSign}
          disabled={
            isPending ||
            proposalExecuted ||
            !isConnectedSigner
          }
        >
          {isPending
            ? "Waiting for wallet..."
            : proposalExecuted
              ? "Proposal already executed"
              : !isConnectedSigner
                ? "Treasury signer required"
                : "Sign Proposal"}
        </button>
      </div>

      {signError && (
        <div className="form-message form-message-error">
          Signing failed.
          <small>{signError.message}</small>
        </div>
      )}

      <section className="signature-section">
        <div className="section-heading compact">
          <div>
            <p className="section-eyebrow">
              Multi-signature Authorization
            </p>
            <h3>Collected Signatures</h3>
          </div>

          <span className="proposal-count">
            {uniqueValidSigners.size} /{" "}
            {REQUIRED_SIGNATURES} valid
          </span>
        </div>

        {signatures.length === 0 ? (
          <div className="empty-state">
            No signatures collected yet.
          </div>
        ) : (
          <div className="signature-list">
            {verifiedSignatures.map(
              (item) => (
                <article
                  className="signature-card"
                  key={item.signature}
                >
                  <div className="signature-header">
                    <div>
                      <span className="stat-label">
                        Signer
                      </span>

                      <code>
                        {item.signer}
                      </code>
                    </div>

                    <span
                      className={
                        item.isTreasurySigner
                          ? "signer-badge signer-badge-active"
                          : "signer-badge"
                      }
                    >
                      {item.isTreasurySigner
                        ? "Authorized"
                        : "Not authorized"}
                    </span>
                  </div>

                  {item.recoveredSigner && (
                    <div className="signature-field">
                      <span>
                        Recovered signer
                      </span>

                      <code>
                        {item.recoveredSigner}
                      </code>
                    </div>
                  )}

                  <div className="signature-field">
                    <span>Signature</span>

                    <code>
                      {item.signature}
                    </code>
                  </div>
                </article>
              ),
            )}
          </div>
        )}

        {hasValidThreshold && (
          <div className="threshold-success">
            {REQUIRED_SIGNATURES} /{" "}
            {REQUIRED_SIGNATURES} valid signatures
            from distinct Treasury signers.
          </div>
        )}
      </section>

      <section className="execution-section">
        <div className="section-heading compact">
          <div>
            <p className="section-eyebrow">
              Final Authorization
            </p>
            <h3>Execution</h3>
          </div>
        </div>

        <p className="form-description">
          Execution submits the collected signatures
          to the Treasury contract for final
          on-chain validation.
        </p>

        <button
          className="primary-action"
          onClick={handleExecute}
          disabled={
            proposalExecuted ||
            !hasValidThreshold ||
            isExecuting ||
            isConfirmingExecution
          }
        >
          {proposalExecuted
            ? "Proposal already executed"
            : isExecuting
              ? "Confirm in wallet..."
              : isConfirmingExecution
                ? "Executing..."
                : "Execute Proposal"}
        </button>

        {executionHash && (
          <div className="transaction-result">
            <span>Execution transaction</span>

            <code>
              {executionHash.slice(0, 10)}...
              {executionHash.slice(-8)}
            </code>
          </div>
        )}

        {isExecutionConfirmed && (
          <div className="form-message form-message-success">
            Proposal executed successfully.
          </div>
        )}

        {executionError && (
          <div className="form-message form-message-error">
            Execution failed.

            <small>
              {executionError.message}
            </small>
          </div>
        )}
      </section>
    </section>
  );
}