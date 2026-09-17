import Fastify from "fastify";
import { getTreasuryState,getProposal,createProposal } from "./blockchain/treasury.js";
import { console } from "inspector/promises";
import { authenticateApiKey, requireRole, hasPermission } from "./auth.js";
import type {
  FastifyReply,
  FastifyError,
  FastifyRequest,
} from "fastify";


const app = Fastify({logger: true});

app.setErrorHandler((error, request, reply) => {
  const fastifyError = error as FastifyError;

  if (fastifyError.validation) {
    return reply.code(400).send({
      error: "Invalid request",
    });
  }

  request.log.error(error);

  return reply.code(500).send({
    error: "Internal server error",
  });
});

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

type CreateProposalBody = {
  to: string;
  value: string;
  data: string;
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

app.post(
  "/proposals",
  {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["to", "value", "data"],
        properties: {
          to: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{40}$",
          },
          value: {
            type: "string",
            pattern: "^[0-9]+$",
          },
          data: {
            type: "string",
            pattern: "^0x([a-fA-F0-9]{2})*$",
          },
        },
      },
    },
    preHandler: [
      authenticate,
      async (
        request: FastifyRequest,
        reply: FastifyReply,
      ) => {
        if (!hasPermission(request.user.role, "proposal:create")) {
          return reply.code(403).send({
            error: "Forbidden",
          });
        }
      },
    ],
  },
  async (request, reply) => {
    const body = request.body as CreateProposalBody;

      if (
        typeof body.to !== "string" ||
        typeof body.value !== "string" ||
        typeof body.data !== "string"
      ) {
        return reply.code(400).send({
          error: "Invalid request body",
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

app.post(
  "/proposals/:id/approve",
  {
    schema: {
      params: {
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: {
            type: "string",
            pattern: "^[0-9]+$",
          },
        },
      },
    },
    preHandler: [
      authenticate,
      async (
        request: FastifyRequest,
        reply: FastifyReply,
      ) => {
        if (
          !hasPermission(
            request.user.role,
            "proposal:approve",
          )
        ) {
          return reply.code(403).send({
            error: "Forbidden",
          });
        }
      },
    ],
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };

    const proposalId = BigInt(id);

    try {
      // Confirm that the proposal exists before sending a transaction.
      await getProposal(proposalId);

      const result = await approveProposal(proposalId);

      return {
        proposalId: id,
        transactionHash: result.hash,
      };
    } catch (error) {
      request.log.error(error);

      return reply.code(500).send({
        error: "Failed to approve proposal",
      });
    }
  },
);


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