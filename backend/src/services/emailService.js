const nodemailer = require('nodemailer');
const SystemSettings = require('../models/SystemSettings');

async function getTransporter() {
  let settings = await SystemSettings.findOne({ key: 'default_settings' });
  
  if (!settings) {
    settings = await SystemSettings.create({
      key: 'default_settings',
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
      smtpSecure: process.env.SMTP_SECURE === 'true',
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS || '',
      fromName: process.env.FROM_NAME || 'IAC System',
      fromEmail: process.env.FROM_EMAIL || (process.env.SMTP_USER || 'noreply@iacsystem.org'),
    });
  }

  const host = settings.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = settings.smtpPort || parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = settings.smtpSecure || false;
  const user = settings.smtpUser || process.env.SMTP_USER || '';
  const pass = settings.smtpPass || process.env.SMTP_PASS || '';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: false
    }
  });

  return { transporter, settings };
}

async function sendEmail({ to, subject, html, text }) {
  try {
    const { transporter, settings } = await getTransporter();
    
    if (!settings.smtpUser && !process.env.SMTP_USER) {
      console.warn('[EmailService] SMTP credentials not set. Simulated email send to:', to);
      return { success: true, simulated: true, message: 'SMTP credentials not configured. Email simulated.' };
    }

    const fromAddress = settings.fromEmail 
      ? `"${settings.fromName || 'IAC System'}" <${settings.fromEmail}>`
      : `"${settings.fromName || 'IAC System'}" <${settings.smtpUser}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ''),
      html,
    });

    console.log('[EmailService] Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EmailService] Error sending email:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendTestEmail(targetEmail) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #12201B; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1D8478; margin-top: 0;">IAC System - SMTP Test Email</h2>
      <p>Hello,</p>
      <p>This is a test email sent from the IAC System settings to confirm that your SMTP configuration is working correctly.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777;">Sent at: ${new Date().toLocaleString()}</p>
    </div>
  `;
  return await sendEmail({
    to: targetEmail,
    subject: 'IAC System - SMTP Test Email',
    html,
  });
}

module.exports = {
  sendEmail,
  sendTestEmail,
  getTransporter,
};
