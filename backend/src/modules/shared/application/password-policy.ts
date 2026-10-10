export const PASSWORD_POLICY_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

export function isPasswordPolicyCompliant(password: string): boolean {
  return (
    PASSWORD_POLICY_PATTERN.test(password) &&
    Buffer.byteLength(password, 'utf8') <= 72
  );
}
