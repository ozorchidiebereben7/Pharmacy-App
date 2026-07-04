import { jsPDF } from 'jspdf';
import { formatMoney, formatDateTime } from './format';

const PHARMACY_NAME = 'Ozed Pharmacy';

export function buildReceiptText(sale) {
  const lines = [
    PHARMACY_NAME,
    formatDateTime(sale.date, sale.time),
    `Receipt #${sale.receiptNo}`,
    '--------------------------------',
    ...sale.lines.map((l) => `${l.itemName} x${l.quantity} @ ${formatMoney(l.unitPrice)} = ${formatMoney(l.unitPrice * l.quantity)}`),
    '--------------------------------',
    `Total: ${formatMoney(sale.totalAmount)}`,
    `Payment: ${sale.paymentMethod}`,
    `Served by: ${sale.soldByName || ''}`,
  ];
  if (sale.treatmentNote) lines.push(`Note: ${sale.treatmentNote}`);
  return lines.join('\n');
}

export function buildReceiptPdf(sale) {
  const doc = new jsPDF({ unit: 'pt', format: [226, 500 + sale.lines.length * 16] });
  let y = 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(PHARMACY_NAME, 113, y, { align: 'center' });
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(formatDateTime(sale.date, sale.time), 113, y, { align: 'center' });
  y += 14;
  doc.text(`Receipt #${sale.receiptNo}`, 113, y, { align: 'center' });
  y += 14;
  doc.line(10, y, 216, y);
  y += 14;
  for (const l of sale.lines) {
    doc.text(`${l.itemName} x${l.quantity}`, 10, y);
    doc.text(formatMoney(l.unitPrice * l.quantity), 216, y, { align: 'right' });
    y += 16;
  }
  doc.line(10, y, 216, y);
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 10, y);
  doc.text(formatMoney(sale.totalAmount), 216, y, { align: 'right' });
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment: ${sale.paymentMethod}`, 10, y);
  y += 14;
  doc.text(`Served by: ${sale.soldByName || ''}`, 10, y);
  y += 14;
  if (sale.treatmentNote) {
    doc.text(`Note: ${sale.treatmentNote}`, 10, y, { maxWidth: 206 });
  }
  return doc;
}

export async function shareReceipt(sale) {
  const doc = buildReceiptPdf(sale);
  const blob = doc.output('blob');
  const file = new File([blob], `receipt-${sale.receiptNo}.pdf`, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Receipt #${sale.receiptNo}` });
      return;
    } catch {
      /* user cancelled or share failed — fall through to download */
    }
  }
  doc.save(`receipt-${sale.receiptNo}.pdf`);
}

export function whatsappShareUrl(sale) {
  const text = encodeURIComponent(buildReceiptText(sale));
  return `https://wa.me/?text=${text}`;
}
