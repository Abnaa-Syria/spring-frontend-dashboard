import { api } from './api';
import { fmtDateTime, fmtMoney } from './format';

export interface PrintableInvoice {
  number: string;
  status: 'ISSUED' | 'VOID';
  issuedAt: string;
  subtotal: string;
  discount: string;
  total: string;
  customer: { name: string; phone: string };
  technician: { user: { name: string } } | null;
  serviceRequest: { number: string } | null;
  items: { description: string; unitPrice: string; quantity: number; lineTotal: string }[];
  payments: { method: string; amount: string; status: string }[];
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Opens a print-ready A4 page for the invoice in a new window. */
export async function printInvoice(inv: PrintableInvoice, methodLabel: (m: string) => string) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return false;
  let company: { 'company.name'?: string; 'company.supportPhone'?: string } = {};
  try {
    company = (await api.get('/config')).data;
  } catch { /* print without company details */ }

  const logo = `${location.origin}/logo-word.svg`;
  const rows = inv.items.map((i, n) => `
    <tr><td>${n + 1}</td><td>${esc(i.description)}</td><td class="num">${esc(fmtMoney(i.unitPrice))}</td>
    <td class="num">${i.quantity}</td><td class="num">${esc(fmtMoney(i.lineTotal))}</td></tr>`).join('');
  const pays = inv.payments.filter((p) => p.status !== 'REJECTED')
    .map((p) => `<div>${esc(methodLabel(p.method))}: <b>${esc(fmtMoney(p.amount))}</b></div>`).join('');
  const discount = Number(inv.discount) > 0
    ? `<tr><td>الخصم</td><td class="num">- ${esc(fmtMoney(inv.discount))}</td></tr>` : '';

  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>فاتورة ${esc(inv.number)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: 'Cairo', sans-serif; color: #1F2A37; margin: 0 auto; padding: 24px; max-width: 820px; font-size: 13px; }
  @media print { body { padding: 0; max-width: none; } }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2E508F; padding-bottom: 14px; }
  .head img { height: 46px; }
  h1 { margin: 0; color: #2E508F; font-size: 26px; }
  .muted { color: #5B6B80; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin: 18px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #F2F7FC; color: #2E508F; text-align: start; padding: 8px; font-weight: 700; }
  td { padding: 8px; border-bottom: 1px solid #E6ECF3; }
  .num { text-align: left; direction: ltr; unicode-bidi: plaintext; white-space: nowrap; }
  .totals { width: 280px; margin-inline-start: auto; margin-top: 12px; }
  .totals td { border: none; padding: 4px 8px; }
  .totals .grand td { border-top: 2px solid #2E508F; font-size: 16px; font-weight: 800; color: #2E508F; }
  .void { color: #D92D20; border: 2px solid #D92D20; padding: 2px 10px; border-radius: 6px; font-weight: 800; }
  .foot { margin-top: 40px; border-top: 1px solid #E6ECF3; padding-top: 10px; text-align: center; }
</style></head><body>
  <div class="head">
    <div><h1>فاتورة ${inv.status === 'VOID' ? '<span class="void">ملغاة</span>' : ''}</h1>
    <div class="muted">رقم: <b>${esc(inv.number)}</b></div></div>
    <img src="${esc(logo)}" alt="">
  </div>
  <div class="grid">
    <div><span class="muted">العميل:</span> <b>${esc(inv.customer.name)}</b></div>
    <div><span class="muted">التاريخ:</span> ${esc(fmtDateTime(inv.issuedAt))}</div>
    <div><span class="muted">الموبايل:</span> <bdi dir="ltr">${esc(inv.customer.phone)}</bdi></div>
    <div><span class="muted">الفني:</span> ${esc(inv.technician?.user.name ?? '—')}</div>
    ${inv.serviceRequest ? `<div><span class="muted">رقم الزيارة:</span> ${esc(inv.serviceRequest.number)}</div>` : ''}
  </div>
  <table><thead><tr><th>#</th><th>البند</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
  <table class="totals">
    <tr><td>الإجمالي قبل الخصم</td><td class="num">${esc(fmtMoney(inv.subtotal))}</td></tr>
    ${discount}
    <tr class="grand"><td>الإجمالي</td><td class="num">${esc(fmtMoney(inv.total))}</td></tr>
  </table>
  ${pays ? `<div style="margin-top:16px"><div class="muted">طريقة الدفع</div>${pays}</div>` : ''}
  <div class="foot muted">${esc(company['company.name'] || 'Spring')}${company['company.supportPhone'] ? ` · خدمة العملاء: <bdi dir="ltr">${esc(company['company.supportPhone'])}</bdi>` : ''}<br>شكراً لثقتكم</div>
  <script>document.fonts.ready.then(() => setTimeout(() => window.print(), 150));</script>
</body></html>`);
  w.document.close();
  return true;
}
