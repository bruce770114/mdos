import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendBillEmail(
    to: string,
    subject: string,
    html: string,
    pdfBuffer?: Buffer,
    billNo?: string,
  ): Promise<void> {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — skipping email send');
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const attachments: any[] = [];
    if (pdfBuffer && billNo) {
      attachments.push({
        filename: `账单-${billNo}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    try {
      await transporter.sendMail({
        from: user,
        to,
        subject,
        html,
        attachments,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (e) {
      this.logger.error(`Failed to send email to ${to}`, e);
    }
  }
}
