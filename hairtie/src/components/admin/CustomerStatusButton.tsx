"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setCustomerStatus } from "@/app/actions/admin/misc";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export function CustomerStatusButton({
  userId,
  blocked,
}: {
  userId: string;
  blocked: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className={blocked ? "adm-btn adm-btn-ghost" : "adm-btn adm-btn-danger"}
      disabled={pending}
      onClick={() => {
        if (!blocked && !window.confirm("Block this customer? They will not be able to sign in.")) return;
        start(async () => {
          const result = await setCustomerStatus(userId, blocked ? "ACTIVE" : "BLOCKED");
          show(result.message ?? "", result.ok ? "default" : "error");
          if (result.ok) router.refresh();
        });
      }}
    >
      {pending ? <Spinner size={13} /> : null}
      {blocked ? "Unblock" : "Block"}
    </button>
  );
}
