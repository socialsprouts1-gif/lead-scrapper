import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { allReviews } from "@/lib/reviews";
import { productById } from "@/lib/catalog";
import { formatDate } from "@/lib/utils";
import { AdminPage, EmptyState, PageHeader, Pagination } from "@/components/admin/ui";
import { FilterSelect, SearchInput } from "@/components/admin/Controls";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { Stars } from "@/components/ui/Stars";

const PER_PAGE = 20;

const TONE = {
  PENDING: { bg: "#f3ece2", color: "#8a6b3c", label: "Waiting for you" },
  APPROVED: { bg: "#e4f0e6", color: "#356b40", label: "Published" },
  REJECTED: { bg: "#f6e7e7", color: "#8a3c3c", label: "Hidden" },
};

export default async function AdminReviewsPage(props: PageProps<"/admin/reviews">) {
  const params = await props.searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const page = Math.max(Number(params.page ?? 1), 1);

  const everything = allReviews().map((review) => ({
    ...review,
    product: productById(review.productId),
  }));
  const term = q.toLowerCase();

  const matched = everything
    .filter((review) => {
      if (q) {
        const hit =
          review.authorName.toLowerCase().includes(term) ||
          review.body.toLowerCase().includes(term) ||
          (review.product?.name.toLowerCase().includes(term) ?? false);
        if (!hit) return false;
      }
      if (status && review.status !== status) return false;
      return true;
    })
    // Pending reviews first — they are the ones needing attention.
    .sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"));

  const total = matched.length;
  const reviews = matched.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pending = everything.filter((review) => review.status === "PENDING").length;
  const pageCount = Math.ceil(total / PER_PAGE);

  function hrefFor(target: number) {
    const next = new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])) as [string, string][],
    );
    next.set("page", String(target));
    return `/admin/reviews?${next.toString()}`;
  }

  return (
    <AdminPage>
      <PageHeader
        title="Reviews"
        description={
          pending > 0
            ? `${pending} ${pending === 1 ? "review is" : "reviews are"} waiting for you. Reviews only show on your shop once you publish them.`
            : "Reviews only show on your shop once you publish them."
        }
      />

      <Suspense fallback={<div className="h-10" />}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search reviews" />
          <FilterSelect
            name="status"
            label="Status"
            allLabel="All reviews"
            options={[
              { value: "PENDING", label: "Waiting for you" },
              { value: "APPROVED", label: "Published" },
              { value: "REJECTED", label: "Hidden" },
            ]}
          />
        </div>
      </Suspense>

      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews here"
          description="When customers review your products they'll appear here for you to publish."
        />
      ) : (
        <>
          <div className="space-y-3">
            {reviews.map((review) => {
              const tone = TONE[review.status];
              return (
                <article key={review.id} className="adm-card p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md" style={{ background: "var(--adm-bg)" }}>
                      {review.product?.images[0] && (
                        <Image src={review.product.images[0].url} alt="" fill sizes="50px" className="object-cover" />
                      )}
                    </div>

                    <div className="min-w-[14rem] flex-1">
                      {review.product ? (
                        <Link href={`/admin/products/${review.product.id}`} className="text-sm underline underline-offset-2">
                          {review.product.name}
                        </Link>
                      ) : (
                        <span className="text-sm" style={{ color: "var(--adm-muted)" }}>Deleted product</span>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <Stars rating={review.rating} size={13} />
                        <span className="adm-pill" style={{ background: tone.bg, color: tone.color }}>
                          {tone.label}
                        </span>
                      </div>
                      {review.title && <p className="mt-2 font-medium">{review.title}</p>}
                      <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>{review.body}</p>
                      <p className="mt-2 text-xs" style={{ color: "var(--adm-muted)" }}>
                        {review.authorName}
                        {review.isVerified && " · Verified buyer"}
                        {review.authorEmail ? ` · ${review.authorEmail}` : ""} · {formatDate(review.createdAt)}
                      </p>
                    </div>

                    <ReviewActions reviewId={review.id} status={review.status} />
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
        </>
      )}
    </AdminPage>
  );
}
