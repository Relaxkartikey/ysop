export type PlanId = "free" | "pro";

export type ExpiryOption = { label: string; hours: number };

export type Plan = {
  id: PlanId;
  label: string;
  maxFileSize: number; // bytes
  maxStorage: number; // bytes, total across active files on platform storage
  maxActiveFiles: number;
  expiryOptions: readonly ExpiryOption[];
  canReplace: boolean;
  canFolders: boolean;
  canTags: boolean;
  canAnalytics: boolean;
  canByos: boolean;
  canPermanentLinks: boolean;
  canSync: boolean; // dashboard persists across devices
};

const MB = 1024 * 1024;

const EXPIRY_OPTIONS: readonly ExpiryOption[] = [
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "10 days", hours: 240 },
];

/**
 * Free and Pro share identical platform limits — Pro's value is advanced
 * features and Bring Your Own Storage, not more platform storage.
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Free",
    maxFileSize: 20 * MB,
    maxStorage: 200 * MB,
    maxActiveFiles: 40,
    expiryOptions: EXPIRY_OPTIONS,
    canReplace: false,
    canFolders: true,
    canTags: false,
    canAnalytics: false,
    canByos: false,
    canPermanentLinks: false,
    canSync: true,
  },
  pro: {
    id: "pro",
    label: "Pro",
    maxFileSize: 20 * MB,
    maxStorage: 200 * MB,
    maxActiveFiles: 40,
    expiryOptions: EXPIRY_OPTIONS,
    canReplace: true,
    canFolders: true,
    canTags: true,
    canAnalytics: true,
    canByos: true,
    canPermanentLinks: true,
    canSync: true,
  },
};

/**
 * There is no billing system yet, so every authenticated user resolves to
 * "free". "pro" is defined and gated end-to-end so turning it on later (once
 * a subscription/entitlement exists) is a resolver change, not a rewrite.
 */
export function planForOwner(owner: { userId: string }): Plan {
  void owner;
  return PLANS.free;
}
