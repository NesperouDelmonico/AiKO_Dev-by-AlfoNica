import { isPasswordPolicyCompliant } from './password-policy';

describe('password policy', () => {
  it('requires 8-72 characters with lowercase, uppercase, and a digit', () => {
    expect(isPasswordPolicyCompliant('StrongPass1')).toBe(true);
    expect(isPasswordPolicyCompliant('A1bcdef')).toBe(false);
    expect(isPasswordPolicyCompliant('PASSWORD1')).toBe(false);
    expect(isPasswordPolicyCompliant('password1')).toBe(false);
    expect(isPasswordPolicyCompliant(`Aa1${'b'.repeat(69)}`)).toBe(true);
    expect(isPasswordPolicyCompliant(`Aa1${'b'.repeat(70)}`)).toBe(false);
    expect(isPasswordPolicyCompliant(`Áa1${'b'.repeat(68)}`)).toBe(false);
  });
});
