import nodemailer from 'nodemailer';

export const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

emailTransporter.verify((error, success) => {
  if (error) {
    console.error('[EMAIL-SERVICE] SMTP connection failed:', error.message);
  } else {
    console.log('[EMAIL-SERVICE] SMTP server connected successfully');
  }
});

interface TicketEmailOptions {
  to: string;
  subject: string;
  eventName: string;
  tickets: Array<{ id: string; html: string }>;
  pdfBuffers: Buffer[];
}

export async function sendTicketEmail(options: TicketEmailOptions): Promise<void> {
  const { to, subject, eventName, tickets, pdfBuffers } = options;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #0a0e17;
      color: #ffffff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #FFD700;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      color: #ffffff;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 16px;
      color: #94A3B8;
    }
    .card {
      background-color: #151922;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
    }
    .event-name {
      font-size: 22px;
      font-weight: bold;
      color: #FFD700;
      margin-bottom: 15px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #1e2533;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #94A3B8;
      font-size: 14px;
    }
    .info-value {
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
    }
    .tickets-section {
      margin-top: 30px;
    }
    .tickets-title {
      font-size: 18px;
      color: #ffffff;
      margin-bottom: 15px;
    }
    .ticket-item {
      background-color: #1e2533;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .ticket-icon {
      width: 40px;
      height: 40px;
      background-color: #00CED1;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0a0e17;
      font-weight: bold;
    }
    .ticket-info {
      flex: 1;
    }
    .ticket-id {
      font-size: 14px;
      color: #ffffff;
    }
    .ticket-status {
      font-size: 12px;
      color: #00CED1;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #1e2533;
    }
    .footer-text {
      color: #94A3B8;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .footer-link {
      color: #FFD700;
      text-decoration: none;
    }
    .cta-button {
      display: inline-block;
      background-color: #FFD700;
      color: #0a0e17;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      font-size: 16px;
      margin-top: 20px;
    }
    .notice {
      background-color: rgba(0, 206, 209, 0.1);
      border: 1px solid #00CED1;
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
    }
    .notice-text {
      color: #00CED1;
      font-size: 14px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Event4U</div>
      <div class="title">I tuoi biglietti sono pronti!</div>
      <div class="subtitle">Grazie per il tuo acquisto</div>
    </div>

    <div class="card">
      <div class="event-name">${eventName}</div>
      <div class="info-row">
        <span class="info-label">Numero biglietti</span>
        <span class="info-value">${tickets.length}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data acquisto</span>
        <span class="info-value">${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      </div>
    </div>

    <div class="tickets-section">
      <div class="tickets-title">I tuoi biglietti</div>
      ${tickets.map((ticket, index) => `
        <div class="ticket-item">
          <div class="ticket-icon">${index + 1}</div>
          <div class="ticket-info">
            <div class="ticket-id">Biglietto #${ticket.id.slice(-8).toUpperCase()}</div>
            <div class="ticket-status">Allegato come PDF</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="notice">
      <p class="notice-text">I biglietti in formato PDF sono allegati a questa email. Stampali o mostrali dal tuo smartphone all'ingresso dell'evento.</p>
    </div>

    <div class="footer">
      <p class="footer-text">Hai domande sul tuo ordine?</p>
      <p class="footer-text">Contattaci a <a href="mailto:support@event4u.it" class="footer-link">support@event4u.it</a></p>
      <p style="color: #94A3B8; font-size: 12px; margin-top: 20px;">&copy; ${new Date().getFullYear()} Event4U - Tutti i diritti riservati</p>
    </div>
  </div>
</body>
</html>
  `;

  const attachments = pdfBuffers.map((buffer, index) => ({
    filename: `biglietto-${tickets[index]?.id?.slice(-8) || index + 1}.pdf`,
    content: buffer,
    contentType: 'application/pdf',
  }));

  const mailOptions = {
    from: `"Event4U" <${process.env.SMTP_USER || 'noreply@event4u.it'}>`,
    to,
    subject,
    html: htmlBody,
    attachments,
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`[EMAIL-SERVICE] Ticket email sent successfully to ${to}`);
  } catch (error) {
    console.error('[EMAIL-SERVICE] Failed to send ticket email:', error);
    throw error;
  }
}

interface PasswordResetEmailOptions {
  to: string;
  firstName: string;
  resetLink: string;
}

export async function sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<void> {
  const { to, firstName, resetLink } = options;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0e17; color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 32px; font-weight: bold; color: #FFD700; margin-bottom: 10px;">Event4U</div>
      <div style="font-size: 24px; color: #ffffff;">Reimposta la tua password</div>
    </div>

    <div style="background-color: #151922; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
      <p style="color: #ffffff; margin-top: 0;">Ciao ${firstName},</p>
      <p style="color: #94A3B8;">Hai richiesto di reimpostare la password del tuo account Event4U.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="display: inline-block; background-color: #FFD700; color: #0a0e17; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Reimposta Password
        </a>
      </div>
      
      <p style="color: #94A3B8; font-size: 14px;">Questo link scadrà tra 1 ora.</p>
      <p style="color: #94A3B8; font-size: 14px;">Se non hai richiesto il reset della password, ignora questa email.</p>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #1e2533;">
      <p style="color: #94A3B8; font-size: 12px;">&copy; ${new Date().getFullYear()} Event4U - Tutti i diritti riservati</p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Event4U" <${process.env.SMTP_USER || 'noreply@event4u.it'}>`,
    to,
    subject: "Reimposta la tua password - Event4U",
    html: htmlBody,
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`[EMAIL-SERVICE] Password reset email sent successfully to ${to}`);
  } catch (error) {
    console.error('[EMAIL-SERVICE] Failed to send password reset email:', error);
    throw error;
  }
}

// ==================== SIAE XML Transmission Email ====================
// Conforme a Allegato C - Provvedimento Agenzia delle Entrate 04/03/2008
// Formato subject RFC-2822: RCA_<AAAA>_<MM>_<GG>_<SSSSSSSS>_<###>_<TTT>_V.<XX>.<YY>

const SIAE_VERSION = 'V.01.00';
const DEFAULT_SYSTEM_CODE = 'EVENT4U1';

/**
 * Genera nome file conforme a Allegato C SIAE
 * Formato: RCA_AAAA_MM_GG_###.xsi o RCA_AAAA_MM_GG_###.xsi.p7m
 */
function generateSiaeFileName(date: Date, sequenceNumber: number, isSigned: boolean): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequenceNumber).padStart(3, '0');
  const extension = isSigned ? '.xsi.p7m' : '.xsi';
  return `RCA_${year}_${month}_${day}_${seq}${extension}`;
}

/**
 * Genera subject email conforme a RFC-2822 SIAE
 * Formato: RCA_<AAAA>_<MM>_<GG>_<SSSSSSSS>_<###>_<TTT>_V.<XX>.<YY>
 */
function generateSiaeEmailSubject(date: Date, systemCode: string, sequenceNumber: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const code = systemCode.padEnd(8, '0').substring(0, 8);
  const seq = String(sequenceNumber).padStart(3, '0');
  return `RCA_${year}_${month}_${day}_${code}_${seq}_XSI_${SIAE_VERSION}`;
}

interface SiaeTransmissionEmailOptions {
  to: string;
  companyName: string;
  transmissionType: 'daily' | 'monthly' | 'corrective';
  periodDate: Date;
  ticketsCount: number;
  totalAmount: string;
  xmlContent: string;
  transmissionId: string;
  systemCode?: string;
  sequenceNumber?: number;
}

export async function sendSiaeTransmissionEmail(options: SiaeTransmissionEmailOptions): Promise<void> {
  const { 
    to, 
    companyName, 
    transmissionType, 
    periodDate, 
    ticketsCount, 
    totalAmount, 
    xmlContent, 
    transmissionId,
    systemCode = DEFAULT_SYSTEM_CODE,
    sequenceNumber = 1
  } = options;

  // Determina se il file è firmato (CMS/PKCS#7 o XML-DSig)
  const isSigned = xmlContent.includes('<Signature') && xmlContent.includes('</Signature>');
  
  // Nome file conforme a Allegato C SIAE
  const fileName = generateSiaeFileName(periodDate, sequenceNumber, isSigned);
  
  // Subject conforme a RFC-2822 SIAE
  const emailSubject = generateSiaeEmailSubject(periodDate, systemCode, sequenceNumber);

  const typeLabels: Record<string, string> = {
    'daily': 'Giornaliera',
    'monthly': 'Mensile',
    'corrective': 'Correttiva'
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; color: #333333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-size: 28px; font-weight: bold; color: #1a237e; margin-bottom: 10px;">Event4U - RiepilogoControlloAccessi</div>
      <div style="font-size: 18px; color: #666;">Trasmissione SIAE - Allegato B/C</div>
    </div>

    <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #1a237e; margin-top: 0; margin-bottom: 20px;">Riepilogo Trasmissione</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Azienda</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${companyName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Tipo Trasmissione</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${typeLabels[transmissionType] || transmissionType}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Data Riferimento</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${formatDate(periodDate)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Numero Biglietti</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${ticketsCount}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Importo Totale</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right; color: #2e7d32;">€${totalAmount}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Codice Sistema</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${systemCode}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Progressivo</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${String(sequenceNumber).padStart(3, '0')}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Stato Firma</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; text-align: right;">${isSigned ? 'FIRMATA (P7M)' : 'NON FIRMATA'}</td>
        </tr>
      </table>
      
      <div style="margin-top: 25px; padding: 15px; background-color: #e8eaf6; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #1a237e;">
          <strong>Nota:</strong> Il file RiepilogoControlloAccessi è allegato con nome <code>${fileName}</code>.
        </p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
          Formato conforme a Provvedimento Agenzia delle Entrate 04/03/2008 (Allegato B e C)
        </p>
      </div>
    </div>

    <div style="text-align: center; color: #999; font-size: 12px;">
      <p>&copy; ${new Date().getFullYear()} Event4U - Sistema Gestione Fiscale SIAE</p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Event4U" <${process.env.SMTP_USER || 'noreply@event4u.it'}>`,
    to,
    subject: emailSubject,
    html: htmlBody,
    attachments: [
      {
        filename: fileName,
        content: xmlContent,
      },
    ],
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`[EMAIL-SERVICE] SIAE RCA email sent to ${to} | Subject: ${emailSubject} | File: ${fileName}`);
  } catch (error) {
    console.error('[EMAIL-SERVICE] Failed to send SIAE transmission email:', error);
    throw error;
  }
}
