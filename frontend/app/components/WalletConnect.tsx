"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
} from "wagmi";

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <section>
        <p>Connected wallet:</p>
        <p>{address}</p>
        <p>Network: {chain?.name ?? "Unknown"}</p>

        <button onClick={() => disconnect()}>
          Disconnect
        </button>
      </section>
    );
  }

  return (
    <section>
      <h2>Connect Wallet</h2>

      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
        >
          {isPending
            ? "Connecting..."
            : `Connect ${connector.name}`}
        </button>
      ))}
    </section>
  );
}