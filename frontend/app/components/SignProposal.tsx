"use client";

import { useState } from "react";

import {
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

type ProposalSignature = {
  signer: `0x${string}`;
  signature: `0x${string}`;
};

export function SignProposal() {
  const { address, isConnected } = useAccount();

  const [signatures, setSignatures] = useState<
    ProposalSignature[]
  >([]);

  const [recoveredSigners, setRecoveredSigners] =
    useState<Record<string, `0x${string}`>>({});

  const {
    signTypedDataAsync,
    isPending,
    error: signError,
  } = useSignTypedData();

  /*
   * Load Proposal #1
   */
  const proposal = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "getProposal",
    args: [1n],
    chainId: 31337,
  });

  /*
   * Load authorized Treasury signers.
   *
   * This is the contract's source of truth.
   */
  const signers = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "getSigner",
    chainId: 31337,
  });

  /*
   * Execute proposal
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
   * Recover the signer locally from the EIP-712 signature.
   *
   * This does NOT replace the contract's validation.
   * The contract will independently recover and validate
   * every signature during execute().
   */
  async function recoverSignature(
    signature: `0x${string}`,
    proposalData: NonNullable<typeof proposal.data>,
  ) {
    return recoverTypedDataAddress({
      domain: {
        name: "SecureTreasury",
        version: "1",
        chainId: 31337,
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
   * Request an EIP-712 signature from the connected wallet.
   */
  async function handleSign() {
    if (
      !isConnected ||
      !address ||
      !proposal.data
    ) {
      return;
    }

    try {
      const newSignature =
        await signTypedDataAsync({
          domain: {
            name: "SecureTreasury",
            version: "1",
            chainId: 31337,
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
   * Verify each collected signature against
   * the Treasury's authorized signer list.
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
   * Keep only signatures whose recovered address
   * belongs to the Treasury signer set.
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
   * Proposal #1 requires two distinct authorized
   * Treasury signers.
   */
  const hasValidThreshold =
    validSignatures.length >= 2 &&
    uniqueValidSigners.size >= 2;

  /*
   * Execute only after the frontend has confirmed
   * two distinct authorized signatures.
   *
   * The contract performs the same validation again.
   */
  function handleExecute() {
    if (!hasValidThreshold) {
      return;
    }

    executeProposal({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: "execute",
      chainId: 31337,
      args: [
        1n,
        signatures.map(
          (item) => item.signature,
        ),
      ],
    });
  }

  /*
   * Wallet connection state
   */
  if (!isConnected) {
    return (
      <section>
        <h2>Sign Proposal</h2>

        <p>
          Connect a wallet to sign the proposal.
        </p>
      </section>
    );
  }

  /*
   * Proposal loading state
   */
  if (proposal.isLoading) {
    return <p>Loading proposal...</p>;
  }

  /*
   * Proposal error
   */
  if (proposal.error) {
    return (
      <p>
        Failed to load proposal.
      </p>
    );
  }

  /*
   * Proposal not found
   */
  if (!proposal.data) {
    return <p>Proposal not found.</p>;
  }

  return (
    <section>
      <h2>Sign Proposal #1</h2>

      <p>
        Target: {proposal.data.to}
      </p>

      <p>
        Value:{" "}
        {proposal.data.value.toString()} wei
      </p>

      <p>
        Data: {proposal.data.data}
      </p>

      <p>
        Nonce:{" "}
        {proposal.data.nonce.toString()}
      </p>

      <button
        onClick={handleSign}
        disabled={isPending}
      >
        {isPending
          ? "Waiting for wallet..."
          : "Sign Proposal"}
      </button>

      {signError && (
        <p>
          Signing failed:{" "}
          {signError.message}
        </p>
      )}

      <section>
        <h3>Collected Signatures</h3>

        <p>
          {signatures.length} / 2 signatures
          collected
        </p>

        {signatures.length === 0 ? (
          <p>
            No signatures collected yet.
          </p>
        ) : (
          <ul>
            {verifiedSignatures.map(
              (item) => (
                <li key={item.signer}>
                  <p>
                    Signer:{" "}
                    {item.signer}
                  </p>

                  <p>
                    Signature:{" "}
                    {item.signature}
                  </p>

                  {item.recoveredSigner && (
                    <p>
                      Recovered signer:{" "}
                      {item.recoveredSigner}
                    </p>
                  )}

                  <p>
                    Treasury signer:{" "}
                    {item.isTreasurySigner
                      ? "Yes"
                      : "No"}
                  </p>
                </li>
              ),
            )}
          </ul>
        )}

        {hasValidThreshold && (
          <p>
            2 / 2 valid signatures from
            distinct Treasury signers.
          </p>
        )}
      </section>

      <section>
        <h3>Execution</h3>

        <button
          onClick={handleExecute}
          disabled={
            !hasValidThreshold ||
            isExecuting ||
            isConfirmingExecution
          }
        >
          {isExecuting
            ? "Confirm in wallet..."
            : isConfirmingExecution
              ? "Executing..."
              : "Execute Proposal"}
        </button>

        {executionHash && (
          <p>
            Execution transaction:{" "}
            {executionHash}
          </p>
        )}

        {isExecutionConfirmed && (
          <p>
            Proposal executed successfully.
          </p>
        )}

        {executionError && (
          <p>
            Execution failed:{" "}
            {executionError.message}
          </p>
        )}
      </section>
    </section>
  );
}