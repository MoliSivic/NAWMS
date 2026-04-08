import type { ZoneSecurity } from "./types";

export const DEFAULT_CURRENCY = "KHR";

export const NOTES_PER_SACK_OPTIONS = [10, 25, 50, 100] as const;

export const DENOMINATIONS_BY_SECURITY: Record<ZoneSecurity, number[]> = {
  high: [200000, 100000, 50000],
  medium: [20000, 10000, 5000],
  low: [2000, 1000, 500],
  mixed: [200, 100],
};

export const ZONE_SECURITY_BY_LETTER = {
  A: "high",
  B: "medium",
  C: "low",
  D: "mixed",
} as const;

export const ALL_DENOMINATIONS = Object.values(DENOMINATIONS_BY_SECURITY)
  .flat()
  .sort((a, b) => a - b);

export const ALLOWED_SACK_VALUES: Record<number, number[]> = Object.fromEntries(
  ALL_DENOMINATIONS.map((denomination) => [
    denomination,
    NOTES_PER_SACK_OPTIONS.map((noteCount) => denomination * noteCount),
  ]),
) as Record<number, number[]>;

export function getAllowedSackValues(denomination: number): number[] {
  return ALLOWED_SACK_VALUES[denomination] || [];
}

export function getDenominationsForSecurity(security: ZoneSecurity): number[] {
  return DENOMINATIONS_BY_SECURITY[security] || [];
}

export function getSecurityForDenomination(
  denomination: number,
): ZoneSecurity | null {
  const security = Object.entries(DENOMINATIONS_BY_SECURITY).find(([, values]) =>
    values.includes(denomination),
  );

  return (security?.[0] as ZoneSecurity | undefined) || null;
}

export function getDenominationsForZoneLetter(zoneLetter: string): number[] {
  const security =
    ZONE_SECURITY_BY_LETTER[
      zoneLetter as keyof typeof ZONE_SECURITY_BY_LETTER
    ] || "high";

  return getDenominationsForSecurity(security);
}

export function buildPackageQrCode(id: number): string {
  return `QR-${String(id).padStart(5, "0")}-NBC`;
}
