export const PUSH_PORT = Symbol('PUSH_PORT');

/** Resultado de un envío (para diagnóstico). */
export type PushReport = {
  /** false si FIREBASE_SERVICE_ACCOUNT_JSON falta o no sirve. */
  configurado: boolean;
  dispositivos: number;
  enviados: number;
  fallidos: number;
  errores: string[];
};

export interface PushPort {
  sendToPatient(
    patientId: string,
    title: string,
    body: string,
  ): Promise<PushReport | void>;
}
