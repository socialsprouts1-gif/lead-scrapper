"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { changePassword, deleteAddress, saveAddress, updateProfile } from "@/app/actions/auth";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export type AddressView = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        const result = await updateProfile({ name: form.get("name"), phone: form.get("phone") });
        show(result.message ?? (result.ok ? "Saved." : "Could not save."), result.ok ? "default" : "error");
        setBusy(false);
        if (result.ok) router.refresh();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="ht-label" htmlFor="profile-name">Name</label>
          <input id="profile-name" name="name" defaultValue={name} required className="ht-input" />
        </div>
        <div>
          <label className="ht-label" htmlFor="profile-phone">Mobile number</label>
          <input id="profile-phone" name="phone" defaultValue={phone} inputMode="numeric" className="ht-input" />
        </div>
      </div>
      <div>
        <label className="ht-label" htmlFor="profile-email">Email</label>
        <input id="profile-email" defaultValue={email} disabled className="ht-input" style={{ opacity: 0.6 }} />
        <p className="mt-1 text-xs" style={{ color: "var(--ht-muted)" }}>
          Contact us if you need to change your email address.
        </p>
      </div>
      <button type="submit" className="ht-btn ht-btn-primary" disabled={busy}>
        {busy ? <Spinner size={14} /> : null} Save changes
      </button>
    </form>
  );
}

export function PasswordForm() {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        setBusy(true);
        const result = await changePassword({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
        });
        show(result.message ?? (result.ok ? "Saved." : "Could not save."), result.ok ? "default" : "error");
        setBusy(false);
        if (result.ok) element.reset();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="ht-label" htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className="ht-input" />
        </div>
        <div>
          <label className="ht-label" htmlFor="newPassword">New password</label>
          <input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" className="ht-input" />
        </div>
      </div>
      <button type="submit" className="ht-btn ht-btn-outline" disabled={busy}>
        {busy ? <Spinner size={14} /> : null} Change password
      </button>
    </form>
  );
}

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha",
  "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export function AddressBook({ addresses }: { addresses: AddressView[] }) {
  const { show } = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<AddressView | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {addresses.length === 0 && editing === null && (
        <p className="text-sm" style={{ color: "var(--ht-muted)" }}>
          You haven&apos;t saved an address yet.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.map((address) => (
          <div key={address.id} className="ht-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {address.label}
                  {address.isDefault && (
                    <span className="ht-badge ml-2" style={{ background: "var(--ht-secondary)" }}>Default</span>
                  )}
                </p>
                <address className="mt-1.5 text-sm not-italic leading-relaxed" style={{ color: "var(--ht-muted)" }}>
                  {address.fullName}<br />
                  {address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />
                  {address.city}, {address.state} {address.pincode}<br />
                  {address.phone}
                </address>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => setEditing(address)} aria-label="Edit address" className="p-1.5">
                  <Pencil size={15} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  disabled={pending}
                  aria-label="Delete address"
                  className="p-1.5"
                  onClick={() =>
                    start(async () => {
                      const result = await deleteAddress(address.id);
                      show(result.message ?? "", result.ok ? "default" : "error");
                      router.refresh();
                    })
                  }
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing === null ? (
        <button type="button" onClick={() => setEditing("new")} className="ht-btn ht-btn-outline">
          <Plus size={15} strokeWidth={1.7} /> Add an address
        </button>
      ) : (
        <form
          className="ht-card space-y-4 p-6"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const result = await saveAddress(
              {
                label: form.get("label"),
                fullName: form.get("fullName"),
                phone: form.get("phone"),
                line1: form.get("line1"),
                line2: form.get("line2"),
                city: form.get("city"),
                state: form.get("state"),
                pincode: form.get("pincode"),
                isDefault: form.get("isDefault") === "on",
              },
              editing === "new" ? undefined : editing.id,
            );
            show(result.message ?? "", result.ok ? "default" : "error");
            if (result.ok) {
              setEditing(null);
              router.refresh();
            }
          }}
        >
          <p className="text-lg">{editing === "new" ? "New address" : "Edit address"}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Label" name="label" defaultValue={editing === "new" ? "Home" : editing.label} />
            <Input label="Full name" name="fullName" defaultValue={editing === "new" ? "" : editing.fullName} required />
            <Input label="Mobile number" name="phone" defaultValue={editing === "new" ? "" : editing.phone} required inputMode="numeric" />
            <Input label="Pincode" name="pincode" defaultValue={editing === "new" ? "" : editing.pincode} required inputMode="numeric" />
            <div className="sm:col-span-2">
              <Input label="Address" name="line1" defaultValue={editing === "new" ? "" : editing.line1} required />
            </div>
            <div className="sm:col-span-2">
              <Input label="Landmark / area" name="line2" defaultValue={editing === "new" ? "" : (editing.line2 ?? "")} />
            </div>
            <Input label="City" name="city" defaultValue={editing === "new" ? "" : editing.city} required />
            <div>
              <label className="ht-label" htmlFor="address-state">State</label>
              <select id="address-state" name="state" defaultValue={editing === "new" ? "" : editing.state} required className="ht-input">
                <option value="">Choose a state</option>
                {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDefault" defaultChecked={editing !== "new" && editing.isDefault} className="h-4 w-4" />
            Use as my default address
          </label>
          <div className="flex gap-3">
            <button type="submit" className="ht-btn ht-btn-primary">Save address</button>
            <button type="button" className="ht-btn ht-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

function Input({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="ht-label" htmlFor={`address-${name}`}>{label}</label>
      <input id={`address-${name}`} name={name} className="ht-input" {...rest} />
    </div>
  );
}
