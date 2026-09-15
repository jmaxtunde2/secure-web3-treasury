import { getTreasuryState } from "./blockchain/treasury.js";

async function main() {
  console.log("Secure Web3 Treasury backend starting...");

  const state = await getTreasuryState();

  console.log("Connected to SecureTreasury");
  console.log("Threshold:", state.threshold.toString());
  console.log("Proposal count:", state.proposalCount.toString());
  console.log("Signers:", state.signers);
  console.log("Treasury balance:", state.balance.toString(), "wei");
}

main().catch((error) => {
  console.error("Backend startup failed:", error);
  process.exit(1);
});