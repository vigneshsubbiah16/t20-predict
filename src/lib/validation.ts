export function isValidEspnId(espnId: string): boolean {
  return /^\d{1,10}$/.test(espnId);
}
