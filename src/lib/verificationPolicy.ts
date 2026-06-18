import type { User } from "@/lib/firestore";

export type KycDocKey =
  | "driversLicenseFront"
  | "driversLicenseBack"
  | "selfie";

/** Default when admin requires verification but did not pick custom docs */
export const DEFAULT_KYC_REQUIRED: KycDocKey[] = [
  "driversLicenseFront",
  "driversLicenseBack",
  "selfie",
];

const ALL_KEYS: KycDocKey[] = [
  "driversLicenseFront",
  "driversLicenseBack",
  "selfie",
];

/** Legacy India doc keys — normalized to US keys when reading admin config */
const LEGACY_KEY_MAP: Record<string, KycDocKey> = {
  aadharFront: "driversLicenseFront",
  aadharBack: "driversLicenseBack",
  pan: "selfie",
};

/** All document types (for admin checkboxes) */
export const KYC_DOC_ORDER: KycDocKey[] = [...ALL_KEYS];

export function normalizeKycDocKeys(
  keys: string[] | undefined
): KycDocKey[] {
  if (!keys?.length) return [...DEFAULT_KYC_REQUIRED];
  const set = new Set<KycDocKey>();
  for (const k of keys) {
    if (ALL_KEYS.includes(k as KycDocKey)) {
      set.add(k as KycDocKey);
    } else if (LEGACY_KEY_MAP[k]) {
      set.add(LEGACY_KEY_MAP[k]);
    }
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
  driversLicenseFront: "Driver's license — front",
  driversLicenseBack: "Driver's license — back",
  selfie: "Selfie with ID",
};

export type KycUrlField =
  | "driversLicenseFrontUrl"
  | "driversLicenseBackUrl"
  | "selfieUrl";

export function urlFieldForDocKey(key: KycDocKey): KycUrlField {
  const map: Record<KycDocKey, KycUrlField> = {
    driversLicenseFront: "driversLicenseFrontUrl",
    driversLicenseBack: "driversLicenseBackUrl",
    selfie: "selfieUrl",
  };
  return map[key];
}

/** Resolve stored URL for a doc key (supports legacy India field names). */
export function getKycDocUrl(user: User, key: KycDocKey): string | undefined {
  const primary = user[urlFieldForDocKey(key)];
  if (primary) return typeof primary === "string" ? primary : (primary as { secure_url?: string }).secure_url;

  const legacy: Record<KycDocKey, keyof User> = {
    driversLicenseFront: "aadharFrontUrl",
    driversLicenseBack: "aadharBackUrl",
    selfie: "selfieUrl",
  };
  const legacyVal = user[legacy[key]];
  if (!legacyVal) return undefined;
  return typeof legacyVal === "string" ? legacyVal : (legacyVal as { secure_url?: string }).secure_url;
}
