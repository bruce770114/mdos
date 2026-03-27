import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfService {
  async generateBillPdf(bill: any, items: any[], customer: any, contract: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text('账单', { align: 'center' });
      doc.moveDown(0.5);

      // Bill info
      doc.fontSize(11);
      doc
        .text(`账单编号: ${bill.billNo ?? ''}`, 50, doc.y)
        .text(`账期: ${formatDate(bill.periodStart)} ~ ${formatDate(bill.periodEnd)}`)
        .text(`客户: ${customer?.name ?? bill.customerId}`)
        .text(`到期日: ${formatDate(bill.dueDate)}`)
        .text(`状态: ${bill.status}`)
        .moveDown();

      // Items table header
      doc.fontSize(10).fillColor('#444').text('费用明细', { underline: true }).moveDown(0.3);

      const tableTop = doc.y;
      const colX = [50, 200, 300, 380, 460];
      doc.fillColor('#000').fontSize(9);
      doc.text('费用类型', colX[0], tableTop);
      doc.text('说明', colX[1], tableTop);
      doc.text('数量', colX[2], tableTop, { width: 70, align: 'right' });
      doc.text('单价', colX[3], tableTop, { width: 70, align: 'right' });
      doc.text('金额', colX[4], tableTop, { width: 70, align: 'right' });
      doc.moveDown(0.8);

      doc
        .moveTo(50, doc.y)
        .lineTo(540, doc.y)
        .strokeColor('#aaa')
        .stroke();
      doc.moveDown(0.3);

      for (const item of items) {
        const y = doc.y;
        doc.fontSize(9);
        doc.text(item.itemType ?? '', colX[0], y, { width: 140 });
        doc.text(item.description ?? '', colX[1], y, { width: 90 });
        doc.text(String(item.quantity ?? 1), colX[2], y, { width: 70, align: 'right' });
        doc.text(formatMoney(item.unitPrice), colX[3], y, { width: 70, align: 'right' });
        doc.text(formatMoney(item.amount), colX[4], y, { width: 70, align: 'right' });
        doc.moveDown(0.8);
      }

      doc.moveDown(0.3);
      doc
        .moveTo(50, doc.y)
        .lineTo(540, doc.y)
        .strokeColor('#aaa')
        .stroke();
      doc.moveDown(0.3);

      // Total
      doc.fontSize(11).text(`合计: ¥${formatMoney(bill.totalAmount)}`, { align: 'right' });
      doc.moveDown(2);

      // Footer
      doc.fontSize(9).fillColor('#888').text('本账单由系统自动生成', { align: 'center' });

      doc.end();
    });
  }

  async generateIncomePdf(data: any[], year: number, month?: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const title = month ? `${year}年${month}月收入报表` : `${year}年收入报表`;
      doc.fontSize(18).text(title, { align: 'center' });
      doc.moveDown();

      const colX = [50, 150, 280, 420];
      doc.fontSize(10).text('年份', colX[0]).text('月份', colX[1], doc.y - 14);
      doc.text('收入合计', colX[2], doc.y - 14).text('笔数', colX[3], doc.y - 14);
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(530, doc.y).stroke();
      doc.moveDown(0.3);

      let grandTotal = 0;
      for (const row of data) {
        const y = doc.y;
        doc.fontSize(9);
        doc.text(String(row.year), colX[0], y);
        doc.text(String(row.month), colX[1], y);
        doc.text(formatMoney(row.totalIncome), colX[2], y, { width: 130, align: 'right' });
        doc.text(String(row.paymentCount), colX[3], y, { width: 80, align: 'right' });
        grandTotal += Number(row.totalIncome);
        doc.moveDown(0.8);
      }

      doc.moveDown(0.5);
      doc.fontSize(11).text(`总收入: ¥${formatMoney(grandTotal)}`, { align: 'right' });

      doc.end();
    });
  }

  async generateAgingPdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.fontSize(18).text('账龄分析报表', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`未到期: ¥${formatMoney(data.current)}`);
      doc.text(`逾期 1-30 天: ¥${formatMoney(data.days1To30)}`);
      doc.text(`逾期 31-60 天: ¥${formatMoney(data.days31To60)}`);
      doc.text(`逾期 61-90 天: ¥${formatMoney(data.days61To90)}`);
      doc.text(`逾期 90 天以上: ¥${formatMoney(data.over90Days)}`);
      doc.moveDown();
      doc.fontSize(13).text(`应收合计: ¥${formatMoney(data.totalOutstanding)}`, { align: 'right' });

      doc.end();
    });
  }
}

function formatMoney(val: any): string {
  return Number(val ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

function formatDate(val: any): string {
  if (!val) return '';
  return String(val).slice(0, 10);
}
