export const PUSH_PORT = Symbol('PUSH_PORT');

export interface PushPort {
  sendToPatient(patientId: string, title: string, body: string): Promise<void>;
}
