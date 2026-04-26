import nodemailer from 'nodemailer';
import { queryOne } from '@/lib/db';

interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_encryption: string;
}

export async function sendEmail(
  academyId: number | string,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!to || !subject) return { success: false, error: 'Missing to or subject' };

    const cfg = await queryOne<SmtpConfig>(
      `SELECT smtp_host, smtp_port, smtp_username, smtp_password,
              smtp_from_name, smtp_from_email, smtp_encryption
       FROM academies WHERE id = $1`,
      [academyId]
    );

    if (!cfg?.smtp_host || !cfg?.smtp_from_email) {
      return { success: false, error: 'SMTP not configured' };
    }

    const secure = cfg.smtp_encryption === 'ssl';
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: cfg.smtp_port || 587,
      secure,
      auth: {
        user: cfg.smtp_username,
        pass: cfg.smtp_password,
      },
    });

    await transporter.sendMail({
      from: `"${cfg.smtp_from_name || 'Tutzlly'}" <${cfg.smtp_from_email}>`,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (err) {
    console.error('sendEmail error:', err);
    return { success: false, error: String(err) };
  }
}
