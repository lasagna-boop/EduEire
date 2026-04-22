/** Client-side password rules (stricter than Firebase default minimum length). */

export const PASSWORD_POLICY_HINT =
  "At least 8 characters, including uppercase, lowercase, and a digit.";

export function validatePasswordPolicy(
  password: string
): { ok: true } | { ok: false; message: string } {
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  if (password.length > 128) {
    return { ok: false, message: "Password must be at most 128 characters." };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: "Password must include a lowercase letter." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: "Password must include an uppercase letter." };
  }
  if (!/\d/.test(password)) {
    return { ok: false, message: "Password must include a digit." };
  }
  return { ok: true };
}
