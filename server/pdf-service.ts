// @ts-ignore - html-pdf-node doesn't have type definitions
import htmlPdf from 'html-pdf-node';

interface PdfOptions {
  format?: string;
  width?: string;
  height?: string;
  margin?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  printBackground?: boolean;
  args?: string[];
}

export async function generateTicketPdf(
  html: string,
  widthMm: number,
  heightMm: number
): Promise<Buffer> {
  try {
    const options: PdfOptions = {
      format: undefined,
      width: `${widthMm}mm`,
      height: `${heightMm}mm`,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      printBackground: true,
      args: [
        '--headless',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
    };

    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    
    return pdfBuffer;
  } catch (error) {
    console.error('[PDF-SERVICE] Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
