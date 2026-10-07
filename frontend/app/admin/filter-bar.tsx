/* ─── Admin filter bar: search + filter dropdowns + sort, shared by every tab ─── */

export type FilterState = { q: string; sort: string; selects: Record<string, string> };
export type SelectDef = { key: string; label: string; options: { value: string; label: string }[] };
export type SortDef = { value: string; label: string };
export type Comparator<T> = (a: T, b: T) => number;

export function initialFilter(sort: string): FilterState {
  return { q: "", sort, selects: {} };
}

/** Nilai dropdown filter; "all" kalau belum dipilih. */
export function sel(state: FilterState, key: string): string {
  return state.selects[key] ?? "all";
}

/** Case-insensitive substring match terhadap field mana pun. Query kosong selalu lolos. */
export function matchesQuery(q: string, fields: unknown[]): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => f !== null && f !== undefined && String(f).toLowerCase().includes(needle));
}

/** Urutkan salinan list memakai comparator untuk `sort`; urutan asli kalau tidak dikenal. */
export function applySort<T>(list: T[], sort: string, comparators: Record<string, Comparator<T>>): T[] {
  const cmp = comparators[sort];
  return cmp ? [...list].sort(cmp) : list;
}

const time = (s: string | null | undefined) => {
  const t = s ? Date.parse(s) : NaN;
  return Number.isNaN(t) ? null : t;
};

/** Bandingkan angka; nilai kosong selalu di akhir apa pun arahnya. */
export function byNumber(a: number | null | undefined, b: number | null | undefined, dir: 1 | -1): number {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return dir * (a - b);
}

export function byDate(a: string | null | undefined, b: string | null | undefined, dir: 1 | -1): number {
  return byNumber(time(a), time(b), dir);
}

/** Bandingkan teks secara alami (A–Z, angka berurutan); teks kosong di akhir. */
export function byText(a: string | null | undefined, b: string | null | undefined, dir: 1 | -1): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return dir * a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

const selectStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "rgba(255,255,255,0.85)",
  borderRadius: "0.5rem",
  padding: "0.375rem 0.75rem",
  fontSize: "0.75rem",
  outline: "none",
  cursor: "pointer",
  maxWidth: "100%",
};
const optionStyle: React.CSSProperties = { backgroundColor: "#1a1a2e", color: "rgba(255,255,255,0.85)" };
const labelClass = "text-[0.62rem] uppercase tracking-widest text-white/40 whitespace-nowrap";

export function FilterBar({
  state,
  onChange,
  defaultSort,
  searchPlaceholder,
  selects = [],
  sorts,
  total,
  filtered,
  testId,
}: {
  state: FilterState;
  onChange: (next: FilterState) => void;
  defaultSort: string;
  searchPlaceholder: string;
  selects?: SelectDef[];
  sorts: SortDef[];
  total: number;
  filtered: number;
  testId: string;
}) {
  const isDirty =
    state.q !== "" || state.sort !== defaultSort || Object.values(state.selects).some((v) => v !== "all");

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4" data-testid={testId}>
      <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:min-w-[220px]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={state.q}
          onChange={(e) => onChange({ ...state, q: e.target.value })}
          placeholder={searchPlaceholder}
          aria-label="Search"
          className="flex-1 min-w-0 bg-transparent text-white/85 placeholder:text-white/25 outline-none"
          style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}
          data-testid={`${testId}-search`}
        />
      </div>

      {selects.map((s) => (
        <label key={s.key} className="flex items-center gap-2">
          <span className={labelClass}>{s.label}</span>
          <select
            value={sel(state, s.key)}
            onChange={(e) => onChange({ ...state, selects: { ...state.selects, [s.key]: e.target.value } })}
            style={selectStyle}
            data-testid={`${testId}-${s.key}`}
          >
            <option value="all" style={optionStyle}>All</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value} style={optionStyle}>{o.label}</option>
            ))}
          </select>
        </label>
      ))}

      <label className="flex items-center gap-2">
        <span className={labelClass}>Sort</span>
        <select
          value={state.sort}
          onChange={(e) => onChange({ ...state, sort: e.target.value })}
          style={selectStyle}
          data-testid={`${testId}-sort`}
        >
          {sorts.map((o) => (
            <option key={o.value} value={o.value} style={optionStyle}>{o.label}</option>
          ))}
        </select>
      </label>

      {isDirty && (
        <button
          type="button"
          onClick={() => onChange(initialFilter(defaultSort))}
          className="btn-ghost !py-1.5 !px-3 !text-xs"
          data-testid={`${testId}-reset`}
        >
          Reset
        </button>
      )}
      {filtered !== total && (
        <span className="text-[0.6rem] text-white/30">{filtered} of {total}</span>
      )}
    </div>
  );
}

/** Ubah daftar nilai unik menjadi opsi dropdown, diurutkan A–Z. */
export function toOptions(values: (string | null | undefined)[], label?: (v: string) => string) {
  return [...new Set(values.filter((v): v is string => !!v))]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: label ? label(v) : v }));
}
