import { TreasuryInfo } from "./components/TreasuryInfo";
import { WalletConnect } from "./components/WalletConnect";
import { ProposalList } from "./components/ProposalList";
import { CreateProposal } from "./components/CreateProposal";
import { SignProposal } from "./components/SignProposal";

export default function Home() {
  return (
    <main>
      <WalletConnect />
      <TreasuryInfo />
      <ProposalList />
      <SignProposal />
      <CreateProposal />
    </main>
  );
}