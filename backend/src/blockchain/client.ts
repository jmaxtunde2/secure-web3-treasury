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

const privateKey = process.env.TREASURY_SIGNER_PRIVATE_KEY as `0x${string}`;
if(!privateKey){
  throw new Error("TREASURY_SIGNER_PRIVATE_KEY is not defined in the environment variables.");
}

const privateKey2 = process.env.TREASURY_SIGNER_2_PRIVATE_KEY as `0x${string}`;
if(!privateKey2){
  throw new Error("TREASURY_SIGNER_2_PRIVATE_KEY is not defined in the environment variables.");
}

const account = privateKeyToAccount(privateKey as `0x${string}`);
const account2 = privateKeyToAccount(privateKey2 as `0x${string}`);

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

export const walletClient2 = createWalletClient({
  chain: anvil,
  transport: http(),
  account: account2,
  
});


console.log("Backend signer #1:", account.address);
console.log("Backend signer #2:", account2.address);


