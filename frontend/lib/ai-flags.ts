/**
 * Master switch untuk seluruh komponen AI.
 *
 * AI dimatikan secara default dan hanya menyala kalau `ENABLE_AI=true`. Yang ikut mati:
 * - risk scoring MiMo + penulisan hasil ke oracle on-chain setelah trade (ADR-025)
 * - market insight dan price suggestion Gemini di marketplace (ADR-024)
 *
 * Mematikannya tidak boleh mengganggu jalur utama: trade tetap bisa diselesaikan, hanya
 * tanpa skor. Karena tidak ada transaksi yang di-flag, seluruh trade ikut dihitung di FVM.
 * Lihat ADR-030.
 */
export function isAIEnabled(): boolean {
  return process.env.ENABLE_AI === "true";
}
