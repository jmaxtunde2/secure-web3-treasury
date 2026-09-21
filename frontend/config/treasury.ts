// export const treasuryAddress =
//   "0x5fbdb2315678afecb367f032d93f642f64180aa3" as const;

// Sepolia contrac
export const treasuryAddress =
  "0x8621D2F90346d40862aF0ba265b383D3C95Fc908" as const;

export const treasuryAbi = [
  {
    type: "function",
    name: "threshold",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "proposalCount",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
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
    outputs: [
      {
        name: "",
        type: "uint256",
      },
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
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "approvalCount", type: "uint256" },
          { name: "data", type: "bytes" },
          { name: "nonce", type: "uint256" },
          { name: "executed", type: "bool" },
        ],
      },
    ],
  },
] as const;