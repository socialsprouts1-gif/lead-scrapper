"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginCustomer, registerCustomer } from "@/app/actions/auth";
import { Spinner } from "@/components/ui/Spinner";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const result = await loginCustomer(
      { email: form.get("email"), password: form.get("password") },
      next,
    );
    if (result.ok && result.redirectTo) {
      router.push(result.redirectTo);
      router.refresh();
    } else {
      setError(result.message ?? "Could not sign you in.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="ht-label" htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="ht-input" />
      </div>
      <div>
        <label className="ht-label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="ht-input" />
      </div>
      {error && <p className="text-sm" style={{ color: "#a33" }} role="alert">{error}</p>}
      <button type="submit" className="ht-btn ht-btn-primary w-full" disabled={busy}>
        {busy ? <Spinner size={14} /> : null}
        Sign in
      </button>
      <p className="text-center text-sm" style={{ color: "var(--ht-muted)" }}>
        New to Hairtie?{" "}
        <Link href="/account/register" className="ht-underline" style={{ color: "var(--ht-text)" }}>
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const result = await registerCustomer({
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      password: form.get("password"),
    });
    if (result.ok && result.redirectTo) {
      router.push(result.redirectTo);
      router.refresh();
    } else {
      setError(result.message ?? "Could not create your account.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="ht-label" htmlFor="name">Your name</label>
        <input id="name" name="name" required autoComplete="name" className="ht-input" />
      </div>
      <div>
        <label className="ht-label" htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="ht-input" />
      </div>
      <div>
        <label className="ht-label" htmlFor="phone">Mobile number (optional)</label>
        <input id="phone" name="phone" inputMode="numeric" autoComplete="tel" className="ht-input" />
      </div>
      <div>
        <label className="ht-label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="ht-input" />
        <p className="mt-1 text-xs" style={{ color: "var(--ht-muted)" }}>At least 8 characters.</p>
      </div>
      {error && <p className="text-sm" style={{ color: "#a33" }} role="alert">{error}</p>}
      <button type="submit" className="ht-btn ht-btn-primary w-full" disabled={busy}>
        {busy ? <Spinner size={14} /> : null}
        Create account
      </button>
      <p className="text-center text-sm" style={{ color: "var(--ht-muted)" }}>
        Already have an account?{" "}
        <Link href="/account/login" className="ht-underline" style={{ color: "var(--ht-text)" }}>Sign in</Link>
      </p>
    </form>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className ?? "ht-underline text-sm"}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { logout } = await import("@/app/actions/auth");
        await logout();
        router.push("/");
        router.refresh();
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
