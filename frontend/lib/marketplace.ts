/**
 * Shared marketplace economics.
 *
 * Fee dan pembagian hasil dipakai di dua tempat yang harus selalu sepakat:
 * jalur sinkron di `app/api/marketplace/listings/[id]/buy/route.ts` (receipt
 * langsung terkonfirmasi) dan jalur rekonsiliasi di `lib/transactions.ts`
 * (receipt baru terkonfirmasi belakangan, ADR-018). Keduanya wajib memakai
 * konstanta yang sama supaya penjual menerima jumlah identik apa pun jalurnya.
 */

/** Fee marketplace dalam persen (ADR-024). Dipungut dalam Crystal dan tidak kembali ke sirkulasi. */
export const MARKETPLACE_FEE_PERCENT = 8;

/** Crystal yang diterima penjual setelah dipotong fee. */
export function calculateSellerProceeds(price: number): number {
  return Math.round(price * (1 - MARKETPLACE_FEE_PERCENT / 100));
}
