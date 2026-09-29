import "server-only";
import { store } from "@/lib/store";

export function approvedReviews(productId: string) {
  return store()
    .reviews.filter((review) => review.productId === productId && review.status === "APPROVED")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function allReviews() {
  return [...store().reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function pendingReviewCount() {
  return store().reviews.filter((review) => review.status === "PENDING").length;
}
