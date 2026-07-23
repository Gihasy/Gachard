"use client";

interface PackCardProps {
  price: number;
  onBuy: () => Promise<void>;
  loading?: boolean;
}

export default function PackCard({ price, onBuy, loading = false }: PackCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 text-center">
      <div className="text-4xl mb-4">🎴</div>
      <h3 className="text-lg font-semibold mb-2">Card Pack</h3>
      <p className="text-gray-500 text-sm mb-4">1 kartu random per pembelian</p>
      <p className="text-2xl font-bold text-indigo-600 mb-4">
        ${(price / 100).toFixed(2)}
      </p>
      <button
        onClick={onBuy}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Buy Pack"}
      </button>
    </div>
  );
}
