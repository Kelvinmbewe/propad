import { createHash } from "crypto";

export function hashContractSnapshot(snapshot: string) {
  return createHash("sha256").update(snapshot, "utf8").digest("hex");
}
