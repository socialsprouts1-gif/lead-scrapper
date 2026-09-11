import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AddressBook } from "@/components/storefront/AccountForms";

export const metadata: Metadata = {
  title: "Addresses | Hairtie",
  robots: { index: false, follow: false },
};

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <h2 className="mb-5 text-xl">Saved addresses</h2>
      <AddressBook addresses={addresses} />
    </div>
  );
}
