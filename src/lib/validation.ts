export function isValidEspnId(espnId: string): boolean {
  return /^\d+$/.test(espnId);
}
