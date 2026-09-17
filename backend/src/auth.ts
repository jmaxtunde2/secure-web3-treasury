import "dotenv/config";

export type Role = "admin" | "operator" | "viewer";

type ApiUser = {
  role: Role;
};

const usersByApiKey = new Map<string, ApiUser>();

function registerApiKey(
  envName: string,
  role: Role,
) {
  const apiKey = process.env[envName];

  if (!apiKey) {
    throw new Error(`${envName} is not defined in the environment variables.`);
  }

  usersByApiKey.set(apiKey, { role });
}

registerApiKey("ADMIN_API_KEY", "admin");
registerApiKey("OPERATOR_API_KEY", "operator");
registerApiKey("VIEWER_API_KEY", "viewer");

export function authenticateApiKey(
  apiKey: string | undefined,
): ApiUser | null {
  if (!apiKey) {
    return null;
  }

  return usersByApiKey.get(apiKey) ?? null;
}

export function requireRole(
  role: Role,
  allowedRoles: Role[],
): boolean {
  return allowedRoles.includes(role);
}

export type Permission =
   | "proposal:create"
  | "proposal:read"
  | "proposal:approve"
  | "proposal:execute";

const rolePermissions: Record<Role, Permission[]> = {
  viewer: [
    "proposal:read",
  ],
  operator: [
    "proposal:read",
    "proposal:create",
  ],
  admin: [
    "proposal:read",
    "proposal:create",
    "proposal:approve",
    "proposal:execute",
  ],
};

export function hasPermission(
  role: Role,
  permission: Permission,
): boolean {
  return rolePermissions[role].includes(permission);
}