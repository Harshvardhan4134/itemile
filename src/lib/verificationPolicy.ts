import type { User } from "@/lib/firestore";

export type KycDocKey = "aadharFront" | "aadharBack" | "pan" | "selfie";

/** Default when admin requires verification but did not pick custom docs */
export const DEFAULT_KYC_REQUIRED: KycDocKey[] = ["aadharFront", "aadharBack", "pan"];

const ALL_KEYS: KycDocKey[] = ["aadharFront", "aadharBack", "pan", "selfie"];

/** All document types (for admin checkboxes) */
export const KYC_DOC_ORDER: KycDocKey[] = [...ALL_KEYS];

export function normalizeKycDocKeys(
  keys: string[] | undefined
): KycDocKey[] {
  if (!keys?.length) return [...DEFAULT_KYC_REQUIRED];
  const set = new Set<KycDocKey>();
  for (const k of keys) {
    if (ALL_KEYS.includes(k as KycDocKey)) set.add(k as KycDocKey);
  }
  return set.size > 0 ? Array.from(set) : [...DEFAULT_KYC_REQUIRED];
}

/** Which uploads are mandatory before submit (empty if exempt). */
export function getKycRequiredKeys(user: User): KycDocKey[] {
  if (user.kycExempt === true) return [];
  return normalizeKycDocKeys(user.kycRequiredDocKeys);
}

/** Rent / pay / post flows: exempt users pass without approved KYC */
export function passesVerificationGate(
  user: User | null | undefined
): boolean {
  if (!user) return false;
  if (user.kycExempt === true) return true;
  return user.verificationStatus === "approved";
}

export const KYC_DOC_LABELS: Record<KycDocKey, string> = {
  aadharFront: "Aadhaar — front",
  aadharBack: "Aadhaar — back",
  pan: "PAN card",
  selfie: "Selfie",
};
