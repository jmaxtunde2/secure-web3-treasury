import { publicClient } from "./client.js";
import "dotenv/config";

const treasuryAddress = process.env.TREASURY_ADDRESS as `0x${string}`;

const treasuryAbi = [
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