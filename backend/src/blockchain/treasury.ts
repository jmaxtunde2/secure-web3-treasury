import { publicClient,walletClient, walletClient2 } from "./client.js";
import "dotenv/config";
import { parseEventLogs } from "viem";

const treasuryAddress = process.env.TREASURY_ADDRESS as `0x${string}`;

const treasuryAbi = [
  {
    type: "error",
    name: "InvalidProposal",
    inputs: [],
  },
  {
    type: "function",
    name: "threshold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "proposalCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getSigner",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address[]",
      },
    ],
  },
  {
    type: "function",
    name: "treasuryBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          {
            name: "to",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "approvalCount",
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
          {
            name: "executed",
            type: "bool",
          },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "createProposal",
    stateMutability: "nonpayable",
    inputs: [
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
    ],
    outputs: [
      {
        name: "proposalId",
        type: "uint256",
      },
    ],
  },
  {
    type: "event",
    name: "ProposalCreated",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        indexed: true,
      },
      {
        name: "to",
        type: "address",
        indexed: true,
      },
      {
        name: "value",
        type: "uint256",
        indexed: false,
      },
      {
        name: "data",
        type: "bytes",
        indexed: false,
      },
      {
        name: "nonce",
        type: "uint256",
        indexed: false,
      },
    ],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getTransactionDigest",
    stateMutability: "view",
    inputs: [
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
    outputs: [
      {
        name: "",
        type: "bytes32",
      },
    ],
  },
  {
    type: "function",
    name: "recoverSigner",
    stateMutability: "pure",
    inputs: [
      { name: "digest", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [
      { name: "", type: "address" },
    ],
  },
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "digest", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [
      { name: "", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
      },
      {
        name: "signatures",
        type: "bytes[]",
      },
    ],
    outputs: [],
  },
  {
    type: "error",
    name: "AlreadyExecuted",
    inputs: [],
  },
] as const;

export async function getTreasuryState() {
  const [threshold, proposalCount, signers, balance] =
    await Promise.all([
      publicClient.readContract({
        address: treasuryAddress,
        abi: treasuryAbi,
        functionName: "threshold",
      }),

      publicClient.readContract({
        address: treasuryAddress,
        abi: treasuryAbi,
        functionName: "proposalCount",
      }),

      publicClient.readContract({
        address: treasuryAddress,
        abi: treasuryAbi,
        functionName: "getSigner",
      }),

      publicClient.readContract({
        address: treasuryAddress,
        abi: treasuryAbi,
        functionName: "treasuryBalance",
      }),
    ]);

  return {
    threshold,
    proposalCount,
    signers,
    balance,
  };
}

export async function getProposal(proposalId: bigint) {
  return publicClient.readContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "getProposal",
    args: [proposalId],
  });
}

export async function createProposal(to:`0x${string}`, value: bigint, data: `0x${string}`) {
    const hash = await walletClient.writeContract({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: "createProposal",
      args: [to, value, data],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash, });

    const events = parseEventLogs({
      abi: treasuryAbi,
      logs: receipt.logs,
      eventName: "ProposalCreated",
    });

    if (events.length === 0) {
      throw new Error("ProposalCreated event not found in transaction logs.");
    }

    const proposalId = events[0].args.proposalId;

    //console.log("Decoded events:", events);
    
    return {receipt, hash,proposalId};
}

export async function isTreasurySigner(
  address: `0x${string}`,
): Promise<boolean> {
  const signers = await publicClient.readContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "getSigner",
  });

  return signers.some(
    (signer) => signer.toLowerCase() === address.toLowerCase(),
  );
}

export async function approveProposal(
  proposalId: bigint,
  signer: 1 | 2 = 1,
) {
  const client = signer === 1
    ? walletClient
    : walletClient2;

  const hash = await client.writeContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "approve",
    args: [proposalId],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
  });

  return {
    hash,
    receipt,
  };
}

export async function getProposalDigest(proposalId: bigint) {
  const proposal = await getProposal(proposalId);

  const digest = await publicClient.readContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "getTransactionDigest",
    args: [
      proposal.to,
      proposal.value,
      proposal.data,
      proposal.nonce,
    ],
  });

  return digest;
}

export async function signProposal(
  proposalId: bigint,
  signer: 1 | 2 = 1,
) {
  const proposal = await getProposal(proposalId);

  const client = signer === 1
    ? walletClient
    : walletClient2;

  const signature = await client.signTypedData({
    domain: {
      name: "SecureTreasury",
      version: "1",
      chainId: Number(process.env.CHAIN_ID),
      verifyingContract: treasuryAddress,
    },
    types: {
      Transaction: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "Transaction",
    message: {
      to: proposal.to,
      value: proposal.value,
      data: proposal.data,
      nonce: proposal.nonce,
    },
  });

  return signature;
}

export async function verifyProposalSignature(
  proposalId: bigint,
  signature: `0x${string}`,
) {
  const proposal = await getProposal(proposalId);

  const digest = await publicClient.readContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "getTransactionDigest",
    args: [
      proposal.to,
      proposal.value,
      proposal.data,
      proposal.nonce,
    ],
  });

  const recoveredSigner = await publicClient.readContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "recoverSigner",
    args: [digest, signature],
  });

  const validSigner = await publicClient.readContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "isValidSignature",
    args: [digest, signature],
  });

  return {
    digest,
    recoveredSigner,
    validSigner,
  };
}

export async function executeProposal(
  proposalId: bigint,
  signatures: `0x${string}`[],
) {
  const hash = await walletClient.writeContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: "execute",
    args: [proposalId, signatures],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
  });

  return {
    hash,
    receipt,
  };
}