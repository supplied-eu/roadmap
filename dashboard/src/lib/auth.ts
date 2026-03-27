export function isAdmin(email: string | null | undefined): boolean {
  return email?.toLowerCase() === "johann@supplied.eu";
}
