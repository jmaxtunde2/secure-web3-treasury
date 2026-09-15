import type { Role } from "../auth.js";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      role: Role;
    };
  }
}