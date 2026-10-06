export const ADMIN_ROLES = ["admin", "assistant", "viewer"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type Permission =
  | "dashboard:view"
  | "participants:view"
  | "participants:generate"
  | "participants:change-cell"
  | "participants:deactivate"
  | "participants:reset"
  | "settings:edit"
  | "export:dataset"
  | "export:contacts"
  | "contacts:delete"
  | "audit:view";

/** Permission matrix from FSD-Admin §3. */
const PERMISSIONS: Record<Permission, readonly AdminRole[]> = {
  "dashboard:view": ["admin", "assistant", "viewer"],
  "participants:view": ["admin", "assistant"],
  "participants:generate": ["admin", "assistant"],
  "participants:change-cell": ["admin", "assistant"],
  "participants:deactivate": ["admin", "assistant"],
  "participants:reset": ["admin"],
  "settings:edit": ["admin"],
  "export:dataset": ["admin", "assistant", "viewer"],
  "export:contacts": ["admin"],
  "contacts:delete": ["admin"],
  "audit:view": ["admin"],
};

export function can(role: AdminRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

export type NavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "participants" | "generate" | "export" | "audit";
  permission: Permission;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Dasbor", icon: "dashboard", permission: "dashboard:view" },
  { href: "/admin/participants", label: "Partisipan", icon: "participants", permission: "participants:view" },
  {
    href: "/admin/generate",
    label: "Generate partisipan",
    icon: "generate",
    permission: "participants:generate",
  },
  { href: "/admin/export", label: "Export data", icon: "export", permission: "export:dataset" },
  { href: "/admin/audit", label: "Audit log", icon: "audit", permission: "audit:view" },
];

/** Menu items visible for a role (items without permission are not rendered). */
export function navItemsFor(role: AdminRole): NavItem[] {
  return NAV_ITEMS.filter((item) => can(role, item.permission));
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Admin",
  assistant: "Asisten",
  viewer: "Viewer",
};
