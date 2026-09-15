import "dotenv/config";
import 
      { createPublicClient,http, defineChain,createWalletClient } 
      from "viem";
import { privateKeyToAccount } from "viem/accounts";

const rpcUrl = process.env.RPC_URL as string;
if(!rpcUrl){
  throw new Error("RPC_URL is not defined in the environment variables.");
}

const chainId = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : undefined;
if(!chainId){
  throw new Error("CHAIN_ID is not defined in the environment variables.");
}

const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
if(!privateKey){
  throw new Error("DEPLOYER_PRIVATE_KEY is not defined in the environment variables.");
}

const account = privateKeyToAccount(privateKey as `0x${string}`);

const anvil = defineChain({
  id: chainId,
  name: "Anvil",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
});

export const publicClient = createPublicClient({
  chain: anvil,
  transport: http(),
});

export const walletClient = createWalletClient({
  chain: anvil,
  transport: http(),
  account: account,
  
});