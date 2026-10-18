export function parseTrustProxy(value: string | undefined): boolean | number {
  const setting = value?.trim() ?? 'false';
  if (setting === 'false') return false;
  if (setting === 'true') return true;
  if (/^\d+$/.test(setting)) {
    const hops = Number(setting);
    if (Number.isSafeInteger(hops)) return hops;
  }
  throw new Error(
    "TRUST_PROXY debe ser 'false', 'true' o un número entero de saltos",
  );
}
