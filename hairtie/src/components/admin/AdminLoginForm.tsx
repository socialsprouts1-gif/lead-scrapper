"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { submitAdminPassword } from "@/app/actions/admin/auth";
import { Spinner } from "@/components/ui/Spinner";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        start(async () => {
          const result = await submitAdminPassword(password);
          if (result.ok) {
            router.replace("/admin");
            router.refresh();
            return;
          }
          setError(result.message ?? "That did not work.");
          setPassword("");
        });
      }}
    >
      <label className="adm-label" htmlFor="admin-password">Password</label>
      <input
        id="admin-password"
        type="password"
        className="adm-input"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && (
        <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: "#f7e7e4", color: "#9c3a3a" }}>
          {error}
        </p>
      )}

      <button type="submit" className="adm-btn adm-btn-primary mt-5 w-full" disabled={pending || !password}>
        {pending ? <Spinner size={14} /> : <Lock size={14} strokeWidth={1.8} />} Sign in
      </button>
    </form>
  );
}
