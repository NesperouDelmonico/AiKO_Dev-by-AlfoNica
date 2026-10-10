export const EMAIL_PORT = Symbol('EMAIL_PORT');

export interface EmailPort {
  send(input: { to: string; subject: string; text: string }): Promise<void>;
}
