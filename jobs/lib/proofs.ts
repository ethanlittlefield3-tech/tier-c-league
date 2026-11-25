/** Proof photos delete themselves after 14 days (SCOPE.md, "Receipts on demand"). The weekly job does it. */

export const PROOF_DAYS = 14;

const DAY = 24 * 3_600_000;

/** The proofs old enough to delete. */
export function staleProofs(proofs: { id: string; at: number }[], now: number): string[] {
  return proofs.filter((proof) => Number.isFinite(proof.at) && now - proof.at >= PROOF_DAYS * DAY).map((proof) => proof.id);
}
