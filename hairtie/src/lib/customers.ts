import "server-only";
import { mutate, now, store } from "@/lib/store";
import type { CustomerProfile } from "@/lib/types";

/**
 * There are no accounts, so a customer is an email address that has ordered.
 * Anything the shop owner adds about them — a note, some tags, a block — is
 * kept here against that address.
 */

const blank = (email: string): CustomerProfile => ({
  email,
  tags: [],
  note: "",
  isBlocked: false,
  updatedAt: now(),
});

export function customerProfile(email: string): CustomerProfile {
  const key = email.toLowerCase();
  return store().customerProfiles.find((entry) => entry.email === key) ?? blank(key);
}

export function allCustomerProfiles() {
  return store().customerProfiles;
}

export function saveCustomerProfile(
  email: string,
  patch: Partial<Omit<CustomerProfile, "email" | "updatedAt">>,
) {
  const key = email.toLowerCase();
  return mutate((data) => {
    let profile = data.customerProfiles.find((entry) => entry.email === key);
    if (!profile) {
      profile = blank(key);
      data.customerProfiles.push(profile);
    }
    if (patch.tags !== undefined) profile.tags = patch.tags;
    if (patch.note !== undefined) profile.note = patch.note;
    if (patch.isBlocked !== undefined) profile.isBlocked = patch.isBlocked;
    profile.updatedAt = now();
    return profile;
  });
}

/** Blocked customers cannot place another order. */
export function isCustomerBlocked(email: string) {
  return customerProfile(email).isBlocked;
}
