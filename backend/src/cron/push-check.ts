import type { ServiceAccount } from 'firebase-admin/app';

export type ServiceAccountInfo = {
  variable: string;
  proyecto?: string;
  cuenta?: string;
};

/**
 * Lee FIREBASE_SERVICE_ACCOUNT_JSON y describe qué tiene, sin exponer la
 * llave privada. `account` solo viene si parece una cuenta de servicio.
 */
export function readServiceAccount(raw: string | undefined): {
  info: ServiceAccountInfo;
  account?: ServiceAccount;
} {
  if (raw === undefined) return { info: { variable: 'ausente' } };
  if (raw.trim() === '') return { info: { variable: 'vacía' } };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { info: { variable: 'no es un JSON válido' } };
  }
  const json = (data ?? {}) as Record<string, unknown>;
  if ('project_info' in json) {
    return {
      info: {
        variable:
          'tiene el google-services.json de la app; aquí va la cuenta de servicio',
      },
    };
  }
  const projectId = json.project_id;
  const clientEmail = json.client_email;
  const privateKey = json.private_key;
  if (
    json.type !== 'service_account' ||
    typeof projectId !== 'string' ||
    typeof clientEmail !== 'string' ||
    typeof privateKey !== 'string'
  ) {
    return { info: { variable: 'no es una cuenta de servicio de Firebase' } };
  }
  return {
    info: { variable: 'ok', proyecto: projectId, cuenta: clientEmail },
    account: { projectId, clientEmail, privateKey },
  };
}
