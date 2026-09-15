import Fastify from "fastify";
import { getTreasuryState,getProposal } from "./blockchain/treasury.js";
import { console } from "inspector/promises";

const app = Fastify({logger: true});

app.get("/", async () => {
    return {message: "Welcome to the Secure Web3 Treasury API"};
});

app.get("/treasury", async () => {
    const state = await getTreasuryState();
    return {
        threshold: state.threshold.toString(),
        proposalCount: state.proposalCount.toString(),
        signers: state.signers,
        balance: state.balance.toString(),
    };
});

app.get("/proposals/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!/^\d+$/.test(id)) {
      return reply.code(400).send({
        error: "Invalid proposal ID",
      });
    }

    const proposalId = BigInt(id);
    try {
      const proosal = await getProposal(proposalId);
      return {
        to: proosal.to,
        value: proosal.value.toString(),
        approvalCount: proosal.approvalCount.toString(),
        data: proosal.data,
        nonce: proosal.nonce.toString(),
        executed: proosal.executed,
      };
    } catch (error) {
      request.log.error(error);

  if (
    error instanceof Error &&
        error.message.includes("InvalidProposal()")
      ) {
        return reply.code(404).send({
          error: "Proposal not found",
        });
      }

      return reply.code(500).send({
        error: "Failed to fetch proposal",
      });
    }
});

const start = async () =>{
    try {
      await app.listen({
        port: 3000,
        host: "127.0.0.1",
      });
      console.log("Server listening on port 3000");
    }catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();