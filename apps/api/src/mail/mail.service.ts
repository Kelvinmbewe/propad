import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '@propad/config';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  filename?: string;
  pdfDataUrl?: string;
}

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    if (!env.EMAIL_SERVER) {
      throw new Error('EMAIL_SERVER configuration is required');
    }
    this.transporter = nodemailer.createTransport(env.EMAIL_SERVER);
  }

  async send(options: SendMailOptions) {
    const attachments = [] as { filename: string; content: Buffer; contentType: string }[];
    if (options.pdfDataUrl) {
      const base64 = options.pdfDataUrl.includes(',') ? options.pdfDataUrl.split(',')[1] : options.pdfDataUrl;
      attachments.push({
        filename: options.filename ?? 'receipt.pdf',
        content: Buffer.from(base64, 'base64'),
        contentType: 'application/pdf'
      });
    }

    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments
      });
    } catch (error) {
      this.logger.error('Failed to send email', error as Error);
      throw error;
    }
  }
}
