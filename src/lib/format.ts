import dayjs from 'dayjs';

export const fmtDateTime = (v?: string | null) => (v ? dayjs(v).format('D MMM YYYY، h:mm A') : '—');
export const fmtDate = (v?: string | null) => (v ? dayjs(v).format('D MMM YYYY') : '—');
export const fmtMoney = (v?: string | number | null) =>
  v == null ? '—' : `${fmtNumber(v)} ج.م`;

/** Western digits everywhere, to match phone numbers, codes and dates in the UI. */
export const fmtNumber = (v: string | number) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });

/** Signed amount kept left-to-right so "+5" never renders as "5+" in RTL. */
export const fmtSigned = (n: number) => (n > 0 ? `+${fmtNumber(n)}` : `-${fmtNumber(Math.abs(n))}`);

export const fmtAddress = (a?: {
  governorate?: string; city?: string; area?: string | null; street?: string | null; building?: string | null;
} | null) => (a ? [a.street, a.building && `مبنى ${a.building}`, a.area, a.city, a.governorate].filter(Boolean).join('، ') : '—');
