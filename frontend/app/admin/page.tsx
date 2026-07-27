"use client";

import { useEffect, useState, useCallback } from "react";

type AdminUser = {
  id: string;
  email: string;
  username: string;
  walletAddress: string;
  createdAt: string;
};

type AdminTx = {
  id: string;
  rawId: string;
  txHash: string | null;
  status: string;
  rawStatus: string;
  type: string;
  tokenId: number | null;
  tokenIds: number[] | null;
  userId: string;
  fromAddress: string;
  toAddress: string;
  createdAt: string;
  updatedAt: string;
  error: string | null;
};

type AdminCard = {
  tokenId: number | null;
  templateId: string;
  rarity: number;
  status: string;
  ownerAddress: string;
  createdAt: string;
};

type PrintRequest = {
  txId: string;
  rawTxId: string;
  tokenId: number | null;
  redeemCode: string | null;
  codeStatus: string | null;
  accepted: boolean;
  user: { email: string; username: string; walletAddress: string } | null;
  card: { status: string; rarity: number; templateId: string } | null;
  txStatus: string;
  createdAt: string;
  updatedAt: string;
};

const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];
const BSC_TESTNET_TX = "https://testnet.bscscan.com/tx/";

type TabKey = "users" | "transactions" | "cards" | "prints";

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [txs, setTxs] = useState<AdminTx[]>([]);
  const [cards, setCards] = useState<AdminCard[]>([]);
  const [prints, setPrints] = useState<PrintRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    const endpoints: Record<TabKey, string> = {
      users: "/api/admin/users",
      transactions: "/api/admin/transactions",
      cards: "/api/admin/cards",
      prints: "/api/admin/print-requests",
    };

    fetch(endpoints[tab])
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (tab === "users") setUsers(data.users ?? []);
        if (tab === "transactions") setTxs(data.transactions ?? []);
        if (tab === "cards") setCards(data.cards ?? []);
        if (tab === "prints") setPrints(data.printRequests ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{ background: "#0b0e1a", color: "#e8e8f0" }}
    >
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Gachard Admin Console</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["users", "transactions", "cards", "prints"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background:
                  tab === t
                    ? "rgba(138,92,255,0.2)"
                    : "rgba(255,255,255,0.05)",
                border:
                  tab === t
                    ? "1px solid rgba(138,92,255,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                color: tab === t ? "#fff" : "rgba(255,255,255,0.6)",
              }}
            >
              {t === "prints" ? "Print Requests" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div
            className="p-4 rounded-lg mb-4"
            style={{
              background: "rgba(255,107,186,0.1)",
              border: "1px solid rgba(255,107,186,0.3)",
              color: "#ff6bba",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-white/50">Loading...</div>
        ) : (
          <>
            {tab === "users" && <UsersTable users={users} />}
            {tab === "transactions" && <TxsTable txs={txs} />}
            {tab === "cards" && <CardsTable cards={cards} />}
            {tab === "prints" && (
              <PrintRequestsTable prints={prints} onAccept={fetchData} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Users ─── */

function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Email</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Username</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Wallet Address</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr><td colSpan={4} className="p-6 text-center text-white/40">No users found</td></tr>
          ) : (
            users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td className="p-3">{u.email}</td>
                <td className="p-3">@{u.username}</td>
                <td className="p-3 font-mono text-xs text-white/70">{u.walletAddress}</td>
                <td className="p-3 text-white/60">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Transactions ─── */

function TxsTable({ txs }: { txs: AdminTx[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Invoice ID</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">txHash</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Status</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Type</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {txs.length === 0 ? (
            <tr><td colSpan={5} className="p-6 text-center text-white/40">No transactions found</td></tr>
          ) : (
            txs.map((tx) => (
              <tr key={tx.rawId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td className="p-3">
                  <div className="font-mono text-xs">{tx.id}</div>
                  <div className="text-[0.6rem] text-white/40 font-mono">{tx.rawId}</div>
                </td>
                <td className="p-3 font-mono text-xs">
                  {tx.txHash ? (
                    <a href={`${BSC_TESTNET_TX}${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                    </a>
                  ) : <span className="text-white/30">—</span>}
                </td>
                <td className="p-3">
                  <span className="text-[0.65rem] uppercase tracking-widest px-2 py-0.5 rounded" style={{
                    background: tx.rawStatus === "confirmed" ? "rgba(0,204,255,0.15)" : tx.rawStatus === "failed" ? "rgba(255,107,186,0.15)" : "rgba(255,196,102,0.15)",
                    color: tx.rawStatus === "confirmed" ? "#00ccff" : tx.rawStatus === "failed" ? "#ff6bba" : "#ffc466",
                  }}>{tx.status}</span>
                </td>
                <td className="p-3 capitalize">{tx.type}</td>
                <td className="p-3 text-white/60">{new Date(tx.createdAt).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Cards ─── */

function CardsTable({ cards }: { cards: AdminCard[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Card ID</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Template</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Rarity</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Status</th>
            <th className="text-left p-3 text-white/50 uppercase text-xs tracking-wider">Owner</th>
          </tr>
        </thead>
        <tbody>
          {cards.length === 0 ? (
            <tr><td colSpan={5} className="p-6 text-center text-white/40">No cards found</td></tr>
          ) : (
            cards.map((c, i) => (
              <tr key={c.tokenId ?? `card-${i}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td className="p-3 font-mono">{c.tokenId !== null ? `#${c.tokenId}` : "pending"}</td>
                <td className="p-3">{c.templateId}</td>
                <td className="p-3">{RARITY_LABELS[c.rarity] ?? `Unknown (${c.rarity})`}</td>
                <td className="p-3">
                  <span className="text-[0.65rem] uppercase tracking-widest px-2 py-0.5 rounded" style={{
                    background: c.status === "Real" ? "rgba(0,255,136,0.15)" : c.status === "Vaulted" ? "rgba(255,107,186,0.15)" : c.status === "Digital" ? "rgba(0,204,255,0.15)" : "rgba(255,196,102,0.15)",
                    color: c.status === "Real" ? "#00ff88" : c.status === "Vaulted" ? "#ff6bba" : c.status === "Digital" ? "#00ccff" : "#ffc466",
                  }}>{c.status}</span>
                </td>
                <td className="p-3 font-mono text-xs text-white/70">
                  {c.ownerAddress ? `${c.ownerAddress.slice(0, 6)}...${c.ownerAddress.slice(-4)}` : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Print Requests ─── */

function PrintRequestsTable({ prints, onAccept }: { prints: PrintRequest[]; onAccept: () => void }) {
  const [accepting, setAccepting] = useState<number | null>(null);

  const handleAccept = async (tokenId: number) => {
    setAccepting(tokenId);
    try {
      const res = await fetch("/api/admin/accept-print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId }),
      });
      if (res.ok) {
        onAccept(); // Refresh data
      } else {
        alert("Accept failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setAccepting(null);
    }
  };

  if (prints.length === 0) {
    return (
      <div className="glass p-10 text-center text-white/40">
        No print requests found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prints.map((pr) => (
        <div
          key={pr.rawTxId}
          className="rounded-xl p-5"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: pr.accepted
              ? "1px solid rgba(0,255,136,0.3)"
              : "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex flex-wrap gap-6 items-start">
            {/* Card Info */}
            <div className="min-w-[140px]">
              <p className="text-[0.65rem] uppercase tracking-widest text-white/40 mb-1">Card</p>
              <p className="font-mono text-lg font-bold">
                #{pr.tokenId ?? "?"}
              </p>
              {pr.card && (
                <>
                  <p className="text-xs text-white/60">{pr.card.templateId}</p>
                  <p className="text-xs" style={{ color: "var(--cosmic-violet)" }}>
                    {RARITY_LABELS[pr.card.rarity] ?? "Unknown"}
                  </p>
                </>
              )}
            </div>

            {/* User Info */}
            <div className="min-w-[180px]">
              <p className="text-[0.65rem] uppercase tracking-widest text-white/40 mb-1">User</p>
              {pr.user ? (
                <>
                  <p className="text-sm">{pr.user.email}</p>
                  <p className="text-xs text-white/60">@{pr.user.username}</p>
                  <p className="text-[0.6rem] font-mono text-white/40 mt-1">
                    {pr.user.walletAddress.slice(0, 10)}...{pr.user.walletAddress.slice(-6)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-white/40">Unknown user</p>
              )}
            </div>

            {/* Redeem Code */}
            <div className="min-w-[200px]">
              <p className="text-[0.65rem] uppercase tracking-widest text-white/40 mb-1">Redeem Code</p>
              <p
                className="font-mono text-sm px-3 py-1.5 rounded-lg inline-block select-all"
                style={{
                  background: "rgba(255,196,102,0.1)",
                  border: "1px solid rgba(255,196,102,0.3)",
                  color: "#ffc466",
                }}
              >
                {pr.redeemCode ?? "N/A"}
              </p>
              <p className="text-[0.6rem] text-white/40 mt-1">
                Status: {pr.codeStatus ?? "unknown"}
              </p>
            </div>

            {/* QR Code */}
            <div>
              <p className="text-[0.65rem] uppercase tracking-widest text-white/40 mb-1">QR Code</p>
              {pr.tokenId !== null ? (
                <div className="bg-white p-2 rounded-lg inline-block">
                  <img
                    src={`/api/cards/${pr.tokenId}/qr`}
                    alt={`QR for #${pr.tokenId}`}
                    className="w-24 h-24"
                  />
                </div>
              ) : (
                <p className="text-xs text-white/40">No token ID</p>
              )}
            </div>

            {/* Timestamp */}
            <div className="min-w-[140px]">
              <p className="text-[0.65rem] uppercase tracking-widest text-white/40 mb-1">Requested</p>
              <p className="text-sm text-white/70">
                {new Date(pr.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-white/40">
                {new Date(pr.createdAt).toLocaleTimeString()}
              </p>
              {pr.txStatus && (
                <p className="text-[0.6rem] text-white/40 mt-1">
                  Tx: {pr.txStatus}
                </p>
              )}
            </div>

            {/* Accept Button */}
            <div className="ml-auto">
              {pr.accepted ? (
                <span
                  className="text-[0.7rem] uppercase tracking-widest px-4 py-2 rounded-lg inline-block"
                  style={{
                    background: "rgba(0,255,136,0.1)",
                    border: "1px solid rgba(0,255,136,0.3)",
                    color: "#00ff88",
                  }}
                >
                  Accepted
                </span>
              ) : (
                <button
                  onClick={() => pr.tokenId !== null && handleAccept(pr.tokenId)}
                  disabled={accepting === pr.tokenId || pr.tokenId === null}
                  className="px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,204,255,0.15))",
                    border: "1px solid rgba(0,255,136,0.5)",
                    color: "#00ff88",
                  }}
                  data-testid={`accept-print-${pr.tokenId}`}
                >
                  {accepting === pr.tokenId ? "Accepting..." : "Accept Print"}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
