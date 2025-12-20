import puppeteer from 'puppeteer-core';
import QRCode from 'qrcode';

export async function generateWalletImage(
  ticketData: {
    eventName: string;
    eventDate: Date;
    locationName: string;
    sectorName: string;
    holderName: string;
    price: string;
    ticketCode: string;
    qrCode: string;
  }
): Promise<Buffer> {
  let browser;
  
  try {
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    if (!chromiumPath) {
      throw new Error('PUPPETEER_EXECUTABLE_PATH environment variable not set');
    }
    
    const qrDataUrl = await QRCode.toDataURL(ticketData.qrCode || `TICKET-${ticketData.ticketCode}`, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    const dateStr = ticketData.eventDate.toLocaleDateString('it-IT', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    const timeStr = ticketData.eventDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const walletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1125px;
      height: 354px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #f59e0b 100%);
      color: white;
      display: flex;
      padding: 20px;
    }
    .left {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-right: 20px;
    }
    .event-name {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .info-row {
      display: flex;
      gap: 40px;
    }
    .info-item label {
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.8;
      letter-spacing: 0.5px;
    }
    .info-item p {
      font-size: 18px;
      font-weight: 600;
      margin-top: 2px;
    }
    .holder {
      font-size: 14px;
      opacity: 0.9;
    }
    .right {
      width: 220px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: white;
      border-radius: 16px;
      padding: 15px;
    }
    .qr-code {
      width: 180px;
      height: 180px;
    }
    .ticket-code {
      color: #333;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="left">
    <div class="event-name">${ticketData.eventName || 'Evento'}</div>
    <div class="info-row">
      <div class="info-item">
        <label>Data</label>
        <p>${dateStr}</p>
      </div>
      <div class="info-item">
        <label>Ora</label>
        <p>${timeStr}</p>
      </div>
      <div class="info-item">
        <label>Settore</label>
        <p>${ticketData.sectorName || '-'}</p>
      </div>
    </div>
    <div class="info-row">
      <div class="info-item">
        <label>Luogo</label>
        <p>${ticketData.locationName || '-'}</p>
      </div>
      <div class="info-item">
        <label>Prezzo</label>
        <p>€${ticketData.price}</p>
      </div>
    </div>
    <div class="holder">${ticketData.holderName}</div>
  </div>
  <div class="right">
    <img src="${qrDataUrl}" class="qr-code" alt="QR Code" />
    <div class="ticket-code">${ticketData.ticketCode}</div>
  </div>
</body>
</html>`;

    console.log('[PDF-SERVICE] Launching Chromium for wallet image from:', chromiumPath);
    
    browser = await puppeteer.launch({
      executablePath: chromiumPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1125, height: 354 });
    await page.setContent(walletHtml, { waitUntil: 'networkidle0' });
    
    const imageBuffer = await page.screenshot({ 
      type: 'png',
      omitBackground: false
    });

    console.log('[PDF-SERVICE] Wallet image generated successfully, size:', imageBuffer.length, 'bytes');
    return Buffer.from(imageBuffer);
  } catch (error) {
    console.error('[PDF-SERVICE] Error generating wallet image:', error);
    throw new Error(`Failed to generate wallet image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function generateTicketPdf(
  html: string,
  widthMm: number,
  heightMm: number
): Promise<Buffer> {
  let browser;
  
  try {
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    if (!chromiumPath) {
      throw new Error('PUPPETEER_EXECUTABLE_PATH environment variable not set');
    }
    
    console.log('[PDF-SERVICE] Launching Chromium from:', chromiumPath);
    
    browser = await puppeteer.launch({
      executablePath: chromiumPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process',
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      width: `${widthMm}mm`,
      height: `${heightMm}mm`,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      printBackground: true,
    });
    
    console.log('[PDF-SERVICE] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('[PDF-SERVICE] Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
