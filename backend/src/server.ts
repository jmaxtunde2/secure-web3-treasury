import Fastify from "fastify";
import { getTreasuryState,getProposal,createProposal } from "./blockchain/treasury.js";
import { console } from "inspector/promises";
import { authenticateApiKey, requireRole } from "./auth.js";
import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

const app = Fastify({logger: true});

const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  const apiKey = request.headers["x-api-key"];

  const user = authenticateApiKey(
    typeof apiKey === "string" ? apiKey : undefined,
  );

  if (!user) {
    return reply.code(401).send({
      error: "Unauthorized",
    });
  }

  request.user = user;
};

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

app.post("/proposals",
  {
    preHandler: [
      authenticate,
      async (request: any, reply: any) => {
        if (!requireRole(request.user.role, ["admin", "operator"])) {
          return reply.code(403).send({
            error: "Forbidden",
          });
        }
      },
    ],
  },
  async (request, reply) => {
    const body = request.body as {
      to: `0x${string}`;
      value: string;
      data: `0x${string}`;
    }

      if (
        typeof body.to !== "string" ||
        typeof body.value !== "string" ||
        typeof body.data !== "string"
      ) {
        return reply.code(400).send({
          error: "Invalid request body",
        });
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(body.to)) {
        return reply.code(400).send({
          error: "Invalid recipient address",
        });
      }

      if (!/^\d+$/.test(body.value)) {
        return reply.code(400).send({
          error: "Invalid value",
        });
      }

      if (!/^0x([a-fA-F0-9]{2})*$/.test(body.data)) {
        return reply.code(400).send({
          error: "Invalid calldata",
        });
      }

      try {
        const result = await createProposal(
          body.to as `0x${string}`,
          BigInt(body.value),
          body.data as `0x${string}`,
        );

        return {
          proposalId: result.proposalId.toString(),
          transactionHash: result.hash,
        };
      } catch (error) {
        request.log.error(error);

        return reply.code(500).send({
          error: "Failed to create proposal",
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