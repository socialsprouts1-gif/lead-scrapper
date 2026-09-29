import "server-only";
import { store } from "@/lib/store";

export function activeLooks() {
  return store()
    .looks.filter((look) => look.isActive)
    .sort((a, b) => a.position - b.position);
}
