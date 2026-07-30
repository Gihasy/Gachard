"use client";

import { useEffect, useState, useCallback } from "react";
import PageShell from "@/components/PageShell";

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
  cardId: string | null;
  tokenId: number | null;
  templateId: string;
  rarity: number;
  status: string;
  fulfillmentStatus: string | null;
  ownerAddress: string;
  ownerUsername: string | null;
  createdAt: string;
};

type ShippingAddress = {
  recipientName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  phone: string;
};

type PrintRequest = {
  txId: string;
  rawTxId: string;
  tokenId: number | null;
  redeemCode: string | null;
  codeStatus: string | null;
  accepted: boolean;
  fulfillmentStatus: string | null;
  shippingAddress: ShippingAddress | null;
  user: { email: string; username: string; walletAddress: string } | null;
  card: { cardId: string | null; claimId: string | null; status: string; rarity: number; templateId: string; fulfillmentStatus: string | null } | null;
  txStatus: string;
  createdAt: string;
  updatedAt: string;
};

const RARITY_LABELS = ["Common", "Rare", "Epic", "Legendary"];
const BSC_TESTNET_TX = "https://testnet.bscscan.com/tx/";

type TabKey = "users" | "transactions" | "cards" | "prints";

const TAB_META: Record<TabKey, { label: string; icon: React.ReactNode }> = {
  users: {
    label: "Users",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
  },
  transactions: {
    label: "Transactions",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4M7 4L3 8M7 4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
    ),
  },
  cards: {
    label: "Cards",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="18" rx="2" /><path d="M8 8l9-3 4 11-7 2.5" /></svg>
    ),
  },
  prints: {
    label: "Print Requests",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
    ),
  },
};

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [txs, setTxs] = useState<AdminTx[]>([]);
  const [cards, setCards] = useState<AdminCard[]>([]);
  const [prints, setPrints] = useState<PrintRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/transactions").then((r) => r.json()),
      fetch("/api/admin/cards").then((r) => r.json()),
      fetch("/api/admin/print-requests").then((r) => r.json()),
    ])
      .then(([usersData, txsData, cardsData, printsData]) => {
        setUsers(usersData.users ?? []);
        setTxs(txsData.transactions ?? []);
        setCards(cardsData.cards ?? []);
        setPrints(printsData.printRequests ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const count =
    tab === "users" ? users.length :
    tab === "transactions" ? txs.length :
    tab === "cards" ? cards.length : prints.length;

  const pendingPrints = prints.filter((p) => (p.card?.fulfillmentStatus || p.fulfillmentStatus) !== "Real").length;

  return (
    <PageShell
      testId="admin-page"
      eyebrow="Control Room"
      title={<span className="text-gradient-aurora">Admin Console</span>}
      description="Manage users, monitor on-chain transactions, and fulfil physical card print requests."
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Users" value={users.length} color="var(--electric-blue)" active={tab === "users"} onClick={() => setTab("users")} />
        <SummaryCard label="Transactions" value={txs.length} color="var(--cosmic-violet)" active={tab === "transactions"} onClick={() => setTab("transactions")} />
        <SummaryCard label="Cards" value={cards.length} color="var(--aurora-pink)" active={tab === "cards"} onClick={() => setTab("cards")} />
        <SummaryCard label="Pending Prints" value={pendingPrints} color="var(--aurora-gold)" active={tab === "prints"} onClick={() => setTab("prints")} />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {(["users", "transactions", "cards", "prints"] as const).map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                data-testid={`admin-tab-${t}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, rgba(184,172,255,0.22), rgba(255,107,186,0.14))"
                    : "rgba(255,255,255,0.04)",
                  border: isActive
                    ? "1px solid rgba(184,172,255,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                {TAB_META[t].icon}
                {TAB_META[t].label}
              </button>
            );
          })}
        </div>
        <button
          onClick={fetchAll}
          className="btn-ghost !py-2 !px-4 !text-xs"
          data-testid="admin-refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="p-4 rounded-2xl mb-4"
          style={{
            background: "rgba(255,107,186,0.1)",
            border: "1px solid rgba(255,107,186,0.3)",
            color: "#ff6bba",
          }}
          data-testid="admin-error"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass p-16 text-center text-white/50" data-testid="admin-loading">
          <span className="inline-block w-6 h-6 rounded-full border-2 border-white/20 border-t-white/70 animate-spin mb-3" />
          <p>Loading {TAB_META[tab].label.toLowerCase()}…</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-white/40 mb-3 uppercase tracking-widest" data-testid="admin-count">
            {count} record{count === 1 ? "" : "s"}
          </p>
          {tab === "users" && <UsersTable users={users} />}
          {tab === "transactions" && <TxsTable txs={txs} />}
          {tab === "cards" && <CardsTable cards={cards} />}
          {tab === "prints" && <PrintRequestsTable prints={prints} onAccept={fetchAll} />}
        </>
      )}
    </PageShell>
  );
}

function SummaryCard({
  label, value, color, active, onClick,
}: { label: string; value: number | string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass glass-hover p-5 text-left"
      style={{ borderColor: active ? color : undefined }}
      data-testid={`admin-summary-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <p className="text-[0.62rem] uppercase tracking-[0.2em] text-white/45 mb-2">{label}</p>
      <p className="font-display text-3xl" style={{ color }}>{value}</p>
    </button>
  );
}

/* ─── Shared table shell ─── */
function TableShell({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass overflow-hidden" data-testid="admin-table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-strong)", background: "rgba(255,255,255,0.02)" }}>
              {head}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left px-4 py-3.5 text-white/45 uppercase text-[0.62rem] tracking-[0.18em] font-semibold">{children}</th>
);
const rowStyle = { borderBottom: "1px solid var(--border-subtle)" };

/* ─── Users ─── */
function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <TableShell head={<><TH>Email</TH><TH>Username</TH><TH>Wallet Address</TH><TH>Joined</TH></>}>
      {users.length === 0 ? (
        <tr><td colSpan={4} className="p-8 text-center text-white/40">No users found</td></tr>
      ) : (
        users.map((u) => (
          <tr key={u.id} style={rowStyle} className="hover:bg-white/[0.03] transition-colors">
            <td className="px-4 py-3.5 text-white/90">{u.email}</td>
            <td className="px-4 py-3.5" style={{ color: "var(--cosmic-violet)" }}>@{u.username}</td>
            <td className="px-4 py-3.5 font-mono text-xs text-white/60">{u.walletAddress}</td>
            <td className="px-4 py-3.5 text-white/50">{new Date(u.createdAt).toLocaleDateString()}</td>
          </tr>
        ))
      )}
    </TableShell>
  );
}

/* ─── Transactions ─── */
function TxsTable({ txs }: { txs: AdminTx[] }) {
  return (
    <TableShell head={<><TH>Invoice ID</TH><TH>txHash</TH><TH>Status</TH><TH>Type</TH><TH>Timestamp</TH></>}>
      {txs.length === 0 ? (
        <tr><td colSpan={5} className="p-8 text-center text-white/40">No transactions found</td></tr>
      ) : (
        txs.map((tx) => (
          <tr key={tx.rawId} style={rowStyle} className="hover:bg-white/[0.03] transition-colors">
            <td className="px-4 py-3.5">
              <div className="font-mono text-xs text-white/90">{tx.id}</div>
              <div className="text-[0.6rem] text-white/35 font-mono">{tx.rawId}</div>
            </td>
            <td className="px-4 py-3.5 font-mono text-xs">
              {tx.txHash ? (
                <a href={`${BSC_TESTNET_TX}${tx.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--electric-blue)" }} className="hover:underline">
                  {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                </a>
              ) : <span className="text-white/30">—</span>}
            </td>
            <td className="px-4 py-3.5">
              <StatusPill status={tx.status} rgb={tx.rawStatus === "confirmed" ? "0,204,255" : tx.rawStatus === "failed" ? "255,107,186" : "255,196,102"} />
            </td>
            <td className="px-4 py-3.5 capitalize text-white/80">{tx.type}</td>
            <td className="px-4 py-3.5 text-white/50">{new Date(tx.createdAt).toLocaleString()}</td>
          </tr>
        ))
      )}
    </TableShell>
  );
}

/* ─── Cards ─── */
const FULFILLMENT_COLORS: Record<string, { rgb: string }> = {
  Locked: { rgb: "255,196,102" },
  Processing: { rgb: "138,92,255" },
  Printed: { rgb: "0,204,255" },
  Shipping: { rgb: "255,107,186" },
  Real: { rgb: "0,255,136" },
};

function statusRgb(status: string) {
  return status === "Real" ? "0,255,136" : status === "Vaulted" ? "255,107,186" : status === "Digital" ? "0,204,255" : "255,196,102";
}

function StatusPill({ status, rgb }: { status: string; rgb: string }) {
  return (
    <span className="text-[0.62rem] uppercase tracking-widest px-2.5 py-1 rounded-full inline-block"
      style={{ background: `rgba(${rgb},0.14)`, color: `rgb(${rgb})`, border: `1px solid rgba(${rgb},0.35)` }}>
      {status}
    </span>
  );
}

function CardsTable({ cards }: { cards: AdminCard[] }) {
  return (
    <TableShell head={<><TH>Card ID</TH><TH>Template</TH><TH>Rarity</TH><TH>Status</TH><TH>Fulfillment</TH><TH>Owner</TH></>}>
      {cards.length === 0 ? (
        <tr><td colSpan={6} className="p-8 text-center text-white/40">No cards found</td></tr>
      ) : (
        cards.map((c, i) => (
          <tr key={c.tokenId ?? `card-${i}`} style={rowStyle} className="hover:bg-white/[0.03] transition-colors">
            <td className="px-4 py-3.5 font-mono text-white/90">{c.cardId ? `#${c.cardId}` : c.tokenId !== null ? `#${c.tokenId}` : "pending"}</td>
            <td className="px-4 py-3.5 text-white/80">{c.templateId}</td>
            <td className="px-4 py-3.5">
              <span className={`tag tag-${(RARITY_LABELS[c.rarity] ?? "common").toLowerCase()}`}>{RARITY_LABELS[c.rarity] ?? `?${c.rarity}`}</span>
            </td>
            <td className="px-4 py-3.5"><StatusPill status={c.status} rgb={statusRgb(c.status)} /></td>
            <td className="px-4 py-3.5">
              {c.fulfillmentStatus ? (
                <StatusPill status={c.fulfillmentStatus} rgb={FULFILLMENT_COLORS[c.fulfillmentStatus]?.rgb ?? "230,232,240"} />
              ) : <span className="text-white/30">—</span>}
            </td>
            <td className="px-4 py-3.5 text-xs">
              {c.ownerUsername && <div className="text-white/80 mb-0.5">{c.ownerUsername}</div>}
              {c.ownerAddress ? (
                <div className="font-mono text-[0.6rem] text-white/40">{c.ownerAddress.slice(0, 10)}...{c.ownerAddress.slice(-6)}</div>
              ) : (
                <span className="text-white/30">—</span>
              )}
            </td>
          </tr>
        ))
      )}
    </TableShell>
  );
}

/* ─── Print Requests ─── */
const FULFILLMENT_ACTIONS: Record<string, { label: string; next: string }> = {
  Locked: { label: "Accept & Start Processing", next: "Processing" },
  Processing: { label: "Mark as Printed", next: "Printed" },
  Printed: { label: "Mark as Shipped", next: "Shipping" },
  Shipping: { label: "Awaiting User Claim", next: "" },
};

function PrintRequestsTable({ prints, onAccept }: { prints: PrintRequest[]; onAccept: () => void }) {
  const [processing, setProcessing] = useState<number | null>(null);
  const [trackingInput, setTrackingInput] = useState<Record<number, string>>({});

  const handleFulfillment = async (tokenId: number, action: string) => {
    setProcessing(tokenId);
    try {
      const body: Record<string, unknown> = { tokenId, action };
      if (action === "Shipping") body.trackingNumber = trackingInput[tokenId] || "";
      const res = await fetch("/api/admin/fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onAccept();
      else { const data = await res.json(); alert(data.error || "Action failed"); }
    } catch { alert("Network error"); }
    finally { setProcessing(null); }
  };

  if (prints.length === 0) {
    return <div className="glass p-12 text-center text-white/40">No print requests found</div>;
  }

  return (
    <div className="space-y-4">
      {prints.map((pr) => {
        const fs = pr.card?.fulfillmentStatus || pr.fulfillmentStatus;
        const action = fs ? FULFILLMENT_ACTIONS[fs] : null;
        const fsRgb = fs ? (FULFILLMENT_COLORS[fs]?.rgb ?? "230,232,240") : "230,232,240";

        return (
          <div
            key={pr.rawTxId}
            className="glass p-5"
            style={{ borderColor: fs === "Real" ? "rgba(0,255,136,0.3)" : undefined }}
            data-testid={`print-request-${pr.tokenId}`}
          >
            <div className="flex flex-wrap gap-6 items-start">
              <div className="min-w-[140px]">
                <p className="text-[0.62rem] uppercase tracking-widest text-white/40 mb-1">Card</p>
                <p className="font-display text-xl">#{pr.card?.cardId || pr.tokenId || "?"}</p>
                {pr.card && (
                  <>
                    <p className="text-xs text-white/60">{pr.card.templateId}</p>
                    <span className={`tag tag-${(RARITY_LABELS[pr.card.rarity] ?? "common").toLowerCase()} mt-1 inline-block`}>
                      {RARITY_LABELS[pr.card.rarity] ?? "Unknown"}
                    </span>
                  </>
                )}
              </div>

              <div className="min-w-[180px]">
                <p className="text-[0.62rem] uppercase tracking-widest text-white/40 mb-1">User</p>
                {pr.user ? (
                  <>
                    <p className="text-sm text-white/90">{pr.user.email}</p>
                    <p className="text-xs text-white/60">@{pr.user.username}</p>
                    <p className="text-[0.6rem] font-mono text-white/35 mt-1">
                      {pr.user.walletAddress.slice(0, 10)}...{pr.user.walletAddress.slice(-6)}
                    </p>
                  </>
                ) : <p className="text-xs text-white/40">Unknown user</p>}
              </div>

              <div className="min-w-[200px]">
                <p className="text-[0.62rem] uppercase tracking-widest text-white/40 mb-1">Redeem Code</p>
                <p className="font-mono text-sm px-3 py-1.5 rounded-lg inline-block select-all"
                  style={{ background: "rgba(255,196,102,0.1)", border: "1px solid rgba(255,196,102,0.3)", color: "#ffc466" }}>
                  {pr.redeemCode ?? "N/A"}
                </p>
                <p className="text-[0.6rem] text-white/40 mt-1">Status: {pr.codeStatus ?? "unknown"}</p>
              </div>

              <div className="min-w-[200px]">
                <p className="text-[0.62rem] uppercase tracking-widest text-white/40 mb-1">Shipping Address</p>
                {pr.shippingAddress ? (
                  <div className="text-xs text-white/70 space-y-0.5">
                    <p className="font-medium text-white">{pr.shippingAddress.recipientName}</p>
                    <p>{pr.shippingAddress.addressLine1}</p>
                    {pr.shippingAddress.addressLine2 && <p>{pr.shippingAddress.addressLine2}</p>}
                    <p>{pr.shippingAddress.city}, {pr.shippingAddress.postalCode}</p>
                    <p className="text-white/50">{pr.shippingAddress.phone}</p>
                  </div>
                ) : <p className="text-xs text-white/40">No address</p>}
              </div>

              <div>
                <p className="text-[0.62rem] uppercase tracking-widest text-white/40 mb-1">Scan & Verify QR</p>
                {pr.tokenId !== null ? (
                  <div className="bg-white p-2 rounded-lg inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/cards/${pr.tokenId}/qr`} alt={`QR for #${pr.tokenId}`} className="w-24 h-24" />
                  </div>
                ) : <p className="text-xs text-white/40">No token ID</p>}
                {pr.card?.claimId && pr.card?.fulfillmentStatus === "Shipping" && (
                  <>
                    <p className="text-[0.62rem] uppercase tracking-widest text-white/40 mb-1 mt-3">Claim Shipping QR</p>
                    <div className="bg-white p-2 rounded-lg inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/claim-qr/${pr.card.claimId}`} alt="Claim QR" className="w-24 h-24" />
                    </div>
                    <p className="text-[0.55rem] font-mono text-white/30 mt-1">{pr.card.claimId}</p>
                  </>
                )}
              </div>

              <div className="w-full sm:ml-auto sm:w-auto sm:min-w-[210px] text-left sm:text-right">
                <p className="text-[0.62rem] uppercase tracking-widest text-white/40 mb-2">Fulfillment</p>
                {fs && (
                  <span className="text-[0.68rem] uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-3"
                    style={{ background: `rgba(${fsRgb},0.14)`, color: `rgb(${fsRgb})`, border: `1px solid rgba(${fsRgb},0.35)` }}>
                    {fs}
                  </span>
                )}
                {fs === "Printed" && (
                  <input
                    type="text"
                    placeholder="Tracking number (optional)"
                    value={trackingInput[pr.tokenId ?? 0] || ""}
                    onChange={(e) => setTrackingInput((p) => ({ ...p, [pr.tokenId ?? 0]: e.target.value }))}
                    className="w-full mb-2 px-3 py-2 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-white/30"
                  />
                )}
                {action && action.next && pr.tokenId !== null && (
                  <button
                    onClick={() => handleFulfillment(pr.tokenId!, action.next)}
                    disabled={processing === pr.tokenId}
                    data-testid={`print-action-${pr.tokenId}`}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                    style={{
                      background: action.next === "Real"
                        ? "linear-gradient(135deg, rgba(0,255,136,0.22), rgba(0,204,255,0.15))"
                        : "linear-gradient(135deg, rgba(138,92,255,0.24), rgba(255,107,186,0.16))",
                      border: action.next === "Real" ? "1px solid rgba(0,255,136,0.5)" : "1px solid rgba(138,92,255,0.5)",
                      color: action.next === "Real" ? "#00ff88" : "#b8acff",
                    }}
                  >
                    {processing === pr.tokenId ? "Processing..." : action.label}
                  </button>
                )}
                {fs === "Real" && <span className="text-[0.65rem] text-white/40">Delivered</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
