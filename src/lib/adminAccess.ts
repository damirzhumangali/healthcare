type MaybeAdminUser = {
  email?: string | null;
  role?: string | null;
};

const ADMIN_EMAILS = ["damirzhumangali125@gmail.com"];

export function isAdminAccount(user: MaybeAdminUser | null | undefined) {
  const email = String(user?.email || "").trim().toLowerCase();
  return user?.role === "admin" || ADMIN_EMAILS.includes(email);
}
