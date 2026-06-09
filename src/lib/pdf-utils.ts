import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Use a CDN for the PDF.js worker
const setWorker = () => {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Using unpkg for better consistency with .mjs workers
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
};

export interface CertificateData {
  name: string;
  date: string;
  additionalText: string;
  fontSize: number;
  template: string;
  templatePdfBytes?: Uint8Array | null;
  // Positioning Offsets
  yOffsetName?: number;
  xOffsetName?: number;
  yOffsetDescription?: number;
  xOffsetDescription?: number;
  yOffsetSignatures?: number;
  xOffsetSignatures?: number;
  yOffsetDate?: number;
  xOffsetDate?: number;
  // Font Sizes
  fontSizeDescription?: number;
  fontSizeSignatures?: number;
  fontSizeDate?: number;
  showDateOnCertificate?: boolean;
  showSystemElements?: boolean;
  numSignatures?: number;
  fontName?: string;
  fontDescription?: string;
  fontFooter?: string;
  // Logo Support
  logoBytes?: Uint8Array | null;
  logoX?: number;
  logoY?: number;
  logoScale?: number;
}

export function formatName(name: string): string {
  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e'];
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map((word, index) => {
      if (index > 0 && prepositions.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export const BASE_TEMPLATES = {
  template1: {
    id: 'template1',
    name: '1. Modelo Geral CECM (Padrão)',
    url: 'https://lucasmercer.github.io/certificado/template.pdf',
    description: 'Estilo clássico cívico-militar com ondulações em verde e dourado e selo militar ao fundo.',
    textColor: '#1e293b',
    colors: ['#22442D', '#C2A157'],
    defaultOffsets: {
      yOffsetName: 10,
      xOffsetName: 0,
      fontSize: 44,
      yOffsetDescription: -35,
      xOffsetDescription: 0,
      yOffsetSignatures: -120,
      xOffsetSignatures: 0,
      yOffsetDate: -180,
      xOffsetDate: -270,
      fontName: 'Helvetica-Bold',
      fontDescription: 'Times-Italic',
      fontFooter: 'Helvetica',
      showSystemElements: false,
      numSignatures: 1
    }
  },
  template2: {
    id: 'template2',
    name: '2. Modelo Premium (Paraná)',
    url: 'https://lucasmercer.github.io/certificado/template4.pdf',
    description: 'Design oficial com as cores brasileiras, brasão do Paraná e visual contemporâneo para honras corporativas.',
    textColor: '#0f172a',
    colors: ['#004729', '#C2A157'],
    defaultOffsets: {
      yOffsetName: -15,
      xOffsetName: 0,
      fontSize: 44,
      yOffsetDescription: -65,
      xOffsetDescription: 0,
      yOffsetSignatures: -140,
      xOffsetSignatures: 0,
      yOffsetDate: -170,
      xOffsetDate: 0,
      fontName: 'Helvetica-Bold',
      fontDescription: 'Times-Italic',
      fontFooter: 'Helvetica',
      showSystemElements: false
    }
  },
  template3: {
    id: 'template3',
    name: '3. Modelo Alternativo (Azul/Ouro)',
    url: 'https://lucasmercer.github.io/certificado/template2.pdf',
    description: 'Bordas duplas refinadas com padrão azul-cobalto e faixas douradas clássicas ideais para mérito acadêmico.',
    textColor: '#0f172a',
    colors: ['#0C2134', '#C2A157'],
    defaultOffsets: {
      yOffsetName: 15,
      xOffsetName: 0,
      fontSize: 42,
      yOffsetDescription: -20,
      xOffsetDescription: 0,
      yOffsetSignatures: -125,
      xOffsetSignatures: 0,
      yOffsetDate: -190,
      xOffsetDate: -270,
      fontName: 'Helvetica-Bold',
      fontDescription: 'Times-Italic',
      fontFooter: 'Helvetica',
      showSystemElements: false
    }
  },
  template4: {
    id: 'template4',
    name: '4. Template Especial 6',
    url: 'https://lucasmercer.github.io/certificado/template6%20(1).pdf',
    description: 'Moldura decorativa dourada fina com excelente centralização, perfeita para formaturas de cursos e encerramentos.',
    textColor: '#0f172a',
    colors: ['#1E293B', '#CBD5E1'],
    defaultOffsets: {
      yOffsetName: 20,
      xOffsetName: 0,
      fontSize: 45,
      yOffsetDescription: -15,
      xOffsetDescription: 0,
      yOffsetSignatures: -110,
      xOffsetSignatures: 0,
      yOffsetDate: -200,
      xOffsetDate: -230,
      fontName: 'Helvetica-Bold',
      fontDescription: 'Times-Italic',
      fontFooter: 'Helvetica',
      showSystemElements: false
    }
  },
  template5: {
    id: 'template5',
    name: '5. Template Especial 7',
    url: 'https://lucasmercer.github.io/certificado/template7%20(1).pdf',
    description: 'Layout festivo de alta distinção ornamentado com estrelas e emblemas, ótimo para destaques esportivos ou de liderança.',
    textColor: '#0f172a',
    colors: ['#0F172A', '#E2E8F0'],
    defaultOffsets: {
      yOffsetName: 0,
      xOffsetName: 0,
      fontSize: 46,
      yOffsetDescription: -40,
      xOffsetDescription: 0,
      yOffsetSignatures: -130,
      xOffsetSignatures: 0,
      yOffsetDate: -200,
      xOffsetDate: -250,
      fontName: 'Helvetica-Bold',
      fontDescription: 'Times-Italic',
      fontFooter: 'Helvetica',
      showSystemElements: false
    }
  }
};

const cachedTemplateBytes: Record<string, Uint8Array> = {};

export const fetchTemplateBytes = async (id: string, url: string): Promise<Uint8Array> => {
  if (cachedTemplateBytes[id]) {
    return cachedTemplateBytes[id];
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Status ${response.status} ao baixar template ${id}`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  cachedTemplateBytes[id] = bytes;
  return bytes;
};

export const generateCertificate = async (data: CertificateData): Promise<Uint8Array> => {
  let pdfDoc: PDFDocument;
  let page;
  let width = 841.89;
  let height = 595.28;
  let drawVectorFallback = false;

  const isCustom = data.template === 'custom';
  const showElements = data.showSystemElements !== false;

  const templateConfig = (BASE_TEMPLATES as any)[data.template];
  let templateBytes: Uint8Array | null = null;

  if (templateConfig && !data.templatePdfBytes) {
    try {
      templateBytes = await fetchTemplateBytes(data.template, templateConfig.url);
    } catch (e) {
      console.warn("Falha ao baixar bytes do template remoto:", e);
      drawVectorFallback = true;
    }
  } else if (isCustom && data.templatePdfBytes) {
    templateBytes = data.templatePdfBytes;
  }

  pdfDoc = await PDFDocument.create();

  if (templateBytes && !drawVectorFallback) {
    try {
      const basePdf = await PDFDocument.load(templateBytes.slice());
      const srcPage = basePdf.getPage(0);
      const { width: srcWidth, height: srcHeight } = srcPage.getSize();
      let rotationAngle = srcPage.getRotation().angle || 0;
      
      rotationAngle = ((rotationAngle % 360) + 360) % 360;

      // Determine correct landscape orientation dimensions
      if (rotationAngle === 90 || rotationAngle === 270) {
        width = srcHeight;
        height = srcWidth;
      } else {
        width = srcWidth;
        height = srcHeight;
      }

      page = pdfDoc.addPage([width, height]);
      const [embeddedPage] = await pdfDoc.embedPages([srcPage]);

      // Draw the embedded page with precise rotation cancellation into the clean, 0-rotation canvas
      if (rotationAngle === 0) {
        page.drawPage(embeddedPage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      } else if (rotationAngle === 90) {
        page.drawPage(embeddedPage, {
          x: 0,
          y: height,
          width: height,
          height: width,
          rotate: degrees(-90),
        });
      } else if (rotationAngle === 180) {
        page.drawPage(embeddedPage, {
          x: width,
          y: height,
          width,
          height,
          rotate: degrees(180),
        });
      } else if (rotationAngle === 270) {
        page.drawPage(embeddedPage, {
          x: width,
          y: 0,
          width: height,
          height: width,
          rotate: degrees(90),
        });
      }
    } catch (e) {
      console.warn("Falha ao normalizar/carregar PDF do template, usando gerador vetorial de fallback", e);
      page = pdfDoc.addPage([841.89, 595.28]);
      width = 841.89;
      height = 595.28;
      drawVectorFallback = true;
    }
  } else {
    page = pdfDoc.addPage([841.89, 595.28]);
    width = 841.89;
    height = 595.28;
    drawVectorFallback = true;
  }

  const fonts = {
    'Helvetica': await pdfDoc.embedFont(StandardFonts.Helvetica),
    'Helvetica-Bold': await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    'Times-Roman': await pdfDoc.embedFont(StandardFonts.TimesRoman),
    'Times-Bold': await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    'Times-Italic': await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    'Courier': await pdfDoc.embedFont(StandardFonts.Courier),
  };

  const getFont = (key?: string, fallback: keyof typeof fonts = 'Helvetica') => {
    return (fonts as any)[key || ''] || fonts[fallback];
  };

  const ccmNavy = rgb(12/255, 33/255, 52/255);
  const ccmGreen = rgb(34/255, 68/255, 45/255);
  const ccmGold = rgb(194/255, 161/255, 87/255);
  const ccmLightGreen = rgb(118/255, 168/255, 29/255);

  // 1. Draw Background/Decorations ONLY if we are using drawVectorFallback
  if (drawVectorFallback) {
    const template = data.template || 'template1';
    
    if (template === 'template1' || template === 'custom') {
      // Green/Gold Wave layout (Top Left)
      page.drawEllipse({ x: 0, y: height, xScale: 500, yScale: 200, color: ccmGreen, rotate: { type: 'degrees', angle: -20 } });
      page.drawEllipse({ x: 40, y: height + 20, xScale: 480, yScale: 180, color: ccmGold, rotate: { type: 'degrees', angle: -20 } });
      
      // Gold Seal (Top Left cornerish)
      page.drawCircle({ x: 120, y: height - 120, size: 60, color: ccmGold });
      page.drawCircle({ x: 120, y: height - 120, size: 50, color: rgb(250/255, 217/255, 105/255) });
      
      const title = 'CERTIFICADO';
      const titleFont = fonts['Helvetica-Bold'];
      page.drawText(title, { x: width / 2 - titleFont.widthOfTextAtSize(title, 55) / 2 + 30, y: height - 140, size: 55, font: titleFont, color: ccmNavy });
      
      // Bottom Border
      page.drawRectangle({ x: 30, y: 30, width: width - 60, height: 10, color: ccmGold });

    } else if (template === 'template2') {
      // Blue/Gold Menção Honrosa
      page.drawEllipse({ x: width, y: height, xScale: 400, yScale: 600, color: ccmNavy, rotate: { type: 'degrees', angle: 45 } });
      page.drawEllipse({ x: width - 20, y: height - 20, xScale: 380, yScale: 580, color: ccmGold, rotate: { type: 'degrees', angle: 45 } });
      
      const title = 'CERTIFICADO DE';
      const subtitle = 'MENÇÃO HONROSA';
      const titleFont = fonts['Times-Roman'];
      page.drawText(title, { x: 120, y: height - 110, size: 38, font: titleFont, color: ccmNavy });
      page.drawText(subtitle, { x: 100, y: height - 160, size: 42, font: titleFont, color: ccmNavy });

    } else if (template === 'template3') {
      // Reconhecimento Layout
      page.drawRectangle({ x: 0, y: height - 100, width: 200, height: 200, color: ccmNavy, rotate: { type: 'degrees', angle: 30 } });
      page.drawRectangle({ x: width - 150, y: 0, width: 250, height: 250, color: ccmNavy, rotate: { type: 'degrees', angle: 30 } });
      page.drawRectangle({ x: width - 180, y: -20, width: 250, height: 250, color: ccmLightGreen, rotate: { type: 'degrees', angle: 30 } });

      const title = 'CERTIFICADO';
      const titleFont = fonts['Helvetica-Bold'];
      page.drawText(title, { x: width / 2 - titleFont.widthOfTextAtSize(title, 45) / 2, y: height - 110, size: 45, font: titleFont, color: ccmNavy });
      
      // Ribbon bar
      page.drawRectangle({ x: width / 2 - 150, y: height - 160, width: 300, height: 35, color: ccmLightGreen });
      const ribbonText = 'RECONHECIMENTO';
      page.drawText(ribbonText, { x: width / 2 - fonts['Helvetica-Bold'].widthOfTextAtSize(ribbonText, 16) / 2, y: height - 148, size: 16, font: fonts['Helvetica-Bold'], color: ccmNavy });

    } else if (template === 'template4') {
      // Paraná State Style
      const title = 'Certificado de';
      const subtitle = 'Menção Honrosa';
      const titleFont = fonts['Times-Roman'];
      page.drawText(title, { x: width / 2 - titleFont.widthOfTextAtSize(title, 36) / 2, y: height - 100, size: 36, font: titleFont, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(subtitle, { x: width / 2 - titleFont.widthOfTextAtSize(subtitle, 42) / 2, y: height - 150, size: 42, font: titleFont, color: rgb(0.1, 0.1, 0.1) });
      
      // Quotes section
      const quote = 'Sucesso é o acúmulo de pequenos esforços repetidos dia a dia.';
      page.drawText(quote, { x: width - 350, y: 180, size: 14, font: fonts['Times-Italic'], color: rgb(0.2, 0.2, 0.2) });

    } else if (template === 'template5') {
      // Wave Right
      page.drawEllipse({ x: width, y: 0, xScale: 600, yScale: 900, color: ccmNavy, rotate: { type: 'degrees', angle: 10 } });
      page.drawEllipse({ x: width + 50, y: 0, xScale: 600, yScale: 900, color: ccmGreen, rotate: { type: 'degrees', angle: 15 } });

      const title = 'CERTIFICADO';
      const titleFont = fonts['Helvetica-Bold'];
      page.drawText(title, { x: width / 2 - titleFont.widthOfTextAtSize(title, 55) / 2, y: height - 130, size: 55, font: titleFont, color: ccmNavy, characterSpacing: 8 });
    }
  }

  // 2. Content (Description)
  const descriptionLines = data.additionalText.split('\n');
  const selectedFontDesc = getFont(data.fontDescription, 'Times-Italic');
  let currentY = height - 260 + (data.yOffsetDescription || 0);
  const descFontSize = data.fontSizeDescription || 18;
  const lineSpacing = descFontSize * 1.44; // Proportional line spacing
  
  for (const line of descriptionLines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    
    const descWidth = selectedFontDesc.widthOfTextAtSize(cleanLine, descFontSize);
    page.drawText(cleanLine, {
      x: (width / 2 - descWidth / 2) + (data.xOffsetDescription || 0),
      y: currentY,
      size: descFontSize,
      font: selectedFontDesc,
      color: rgb(0.15, 0.15, 0.15),
    });
    currentY -= lineSpacing;
  }

  // 3. Student Name
  const studentName = data.name;
  const selectedFontName = getFont(data.fontName, 'Helvetica-Bold');
  const originalFontSize = data.fontSize || 48;
  let nameFontSize = originalFontSize;
  let nameWidth = selectedFontName.widthOfTextAtSize(studentName, nameFontSize);
  const maxWidth = width - 240;
  while (nameWidth > maxWidth && nameFontSize > 12) {
    nameFontSize -= 2;
    nameWidth = selectedFontName.widthOfTextAtSize(studentName, nameFontSize);
  }

  // Mathematically compensate for vertical displacement due to font size reduction
  // This keeps the vertical center of the name perfectly stable regardless of length
  const fontChangeOffset = (originalFontSize - nameFontSize) / 2;

  page.drawText(studentName, {
    x: (width / 2 - nameWidth / 2) + (data.xOffsetName || 0),
    y: height / 2 - 40 + (data.yOffsetName || 0) + fontChangeOffset,
    size: nameFontSize,
    font: selectedFontName,
    color: rgb(0, 0, 0),
  });

  // 4. Logo (If provided)
  if (data.logoBytes) {
    try {
      const logoImage = await pdfDoc.embedPng(data.logoBytes);
      const dims = logoImage.scale(data.logoScale || 0.5);
      page.drawImage(logoImage, {
        x: (width / 2 - dims.width / 2) + (data.logoX || 0),
        y: (height - dims.height - 40) + (data.logoY || 0),
        width: dims.width,
        height: dims.height,
      });
    } catch (e) {
      console.error("Failed to embed logo PNG", e);
    }
  }

  // 5. Signatures / Footer (Only if showElements is true)
  if (showElements) {
    const sigY = (height / 2) + (data.yOffsetSignatures || 0);
    const sigXOffset = data.xOffsetSignatures || 0;
    const sigColor = rgb(0.2, 0.2, 0.2);
    const selectedFontFooter = getFont(data.fontFooter, 'Helvetica');
    const template = data.template || 'template1';

    // Signature labels or single/double configuration based on specific model design
    let leftSig = 'Direção';
    let rightSig = 'Direção Aux.';
    
    if (template === 'template2' || template === 'template4') {
      leftSig = 'Direção Geral';
      rightSig = 'Direção Auxiliar';
    } else if (template === 'template3' || template === 'template5') {
      leftSig = 'Direção';
      rightSig = 'Direção Auxiliar';
    }

    const sigFontSize = data.fontSizeSignatures || 10;
    
    if (data.numSignatures === 1) {
      // Centered Single Signature
      const sigLabel = 'Direção';
      const startX = width / 2 - 100 + sigXOffset;
      const endX = width / 2 + 100 + sigXOffset;
      page.drawLine({ start: { x: startX, y: sigY }, end: { x: endX, y: sigY }, thickness: 0.5, color: sigColor });
      page.drawText(sigLabel, { x: (width / 2 + sigXOffset) - selectedFontFooter.widthOfTextAtSize(sigLabel, sigFontSize) / 2, y: sigY - 15, size: sigFontSize, font: selectedFontFooter, color: sigColor });
    } else if (data.numSignatures === 2) {
      // Left Signature
      page.drawLine({ start: { x: 100 + sigXOffset, y: sigY }, end: { x: 300 + sigXOffset, y: sigY }, thickness: 0.5, color: sigColor });
      page.drawText(leftSig, { x: (200 + sigXOffset) - selectedFontFooter.widthOfTextAtSize(leftSig, sigFontSize) / 2, y: sigY - 15, size: sigFontSize, font: selectedFontFooter, color: sigColor });

      // Right Signature
      page.drawLine({ start: { x: width - 300 + sigXOffset, y: sigY }, end: { x: width - 100 + sigXOffset, y: sigY }, thickness: 0.5, color: sigColor });
      page.drawText(rightSig, { x: (width - 200 + sigXOffset) - selectedFontFooter.widthOfTextAtSize(rightSig, sigFontSize) / 2, y: sigY - 15, size: sigFontSize, font: selectedFontFooter, color: sigColor });
    } else if (data.numSignatures === 3) {
      const labels = ['Coordenação', 'Secretaria', 'Direção'];
      const centers = [width * 0.2, width * 0.5, width * 0.8];
      const hw = 80;
      for (let i = 0; i < 3; i++) {
        const cx = centers[i] + sigXOffset;
        page.drawLine({ start: { x: cx - hw, y: sigY }, end: { x: cx + hw, y: sigY }, thickness: 0.5, color: sigColor });
        page.drawText(labels[i], { x: cx - selectedFontFooter.widthOfTextAtSize(labels[i], sigFontSize) / 2, y: sigY - 15, size: sigFontSize, font: selectedFontFooter, color: sigColor });
      }
    } else if (data.numSignatures && data.numSignatures >= 4) {
      const labels = ['Professor(a)', 'Coordenação', 'Direção Auxiliar', 'Direção Geral'];
      const centers = [width * 0.15, width * 0.383, width * 0.616, width * 0.85];
      const hw = 65;
      for (let i = 0; i < 4; i++) {
        const cx = centers[i] + sigXOffset;
        page.drawLine({ start: { x: cx - hw, y: sigY }, end: { x: cx + hw, y: sigY }, thickness: 0.5, color: sigColor });
        page.drawText(labels[i], { x: cx - selectedFontFooter.widthOfTextAtSize(labels[i], sigFontSize) / 2, y: sigY - 15, size: sigFontSize, font: selectedFontFooter, color: sigColor });
      }
    }

    // Label or help text for vertical data alignment reference
    page.drawText('DATA', { x: (width / 2 - selectedFontFooter.widthOfTextAtSize('DATA', Math.max(6, sigFontSize - 2)) / 2) + sigXOffset, y: sigY - 15, size: Math.max(6, sigFontSize - 2), font: selectedFontFooter, color: sigColor });
  }

  // 6. Independent Date Field (always drawn if showDateOnCertificate !== false)
  if (data.showDateOnCertificate !== false) {
    let dateStr = '';
    if (data.date) {
      const parts = data.date.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        dateStr = `Reserva - PR, ${day}/${month}/${year}`;
      } else {
        dateStr = `Reserva - PR, ${data.date}`;
      }
    } else {
      dateStr = `Reserva - PR, __/__/____`;
    }

    const selectedFontFooter = getFont(data.fontFooter, 'Helvetica');
    const xOffsetD = data.xOffsetDate ?? (data.xOffsetSignatures || 0);
    // If yOffsetDate is defined, use it, otherwise fallback to standard default relative to sigY or -170 depending on elements
    const yOffsetD = data.yOffsetDate ?? (showElements ? (data.yOffsetSignatures ?? -120) - 50 : -150);
    const dateFontSize = data.fontSizeDate || 12;

    const dateYPos = (height / 2) + yOffsetD;
    const dateXPos = (width / 2 - selectedFontFooter.widthOfTextAtSize(dateStr, dateFontSize) / 2) + xOffsetD;

    page.drawText(dateStr, { 
      x: dateXPos, 
      y: dateYPos, 
      size: dateFontSize, 
      font: selectedFontFooter, 
      color: rgb(0,0,0) 
    });
  }

  return await pdfDoc.save();
};

export const renderPdfToCanvas = async (pdfBytes: Uint8Array, canvas: HTMLCanvasElement) => {
  let url = '';
  try {
    setWorker();

    // 1. If there's an active render task on this canvas, cancel it first to prevent collisions.
    if ((canvas as any)._currentRenderTask) {
      try {
        (canvas as any)._currentRenderTask.cancel();
      } catch (cancelError) {
        // Safe to ignore: task already processed, resolved or cancelled.
      }
      (canvas as any)._currentRenderTask = null;
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    url = URL.createObjectURL(blob);
    
    const loadingTask = pdfjsLib.getDocument({ 
      url,
      verbosity: 0,
    });
    
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    // Calculate scale to fit container width but keep quality
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      if (url) URL.revokeObjectURL(url);
      return false;
    }

    // CRITICAL FIX: Reset any leftover transforms from previous cancelled renders or pdf.js manipulations
    context.setTransform(1, 0, 0, 1, 0, 0);

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Clear canvas before drawing
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: context,
      canvas: canvas,
      viewport: viewport,
    };
    
    const renderTask = page.render(renderContext);
    (canvas as any)._currentRenderTask = renderTask;

    try {
      await renderTask.promise;
    } catch (renderError: any) {
      if (renderError?.name === 'RenderingCancelledException' || renderError?.message?.includes('cancelled')) {
        // Swallow cancellation exceptions, as they are expected when a new render interrupts a previous one.
        return false;
      }
      throw renderError;
    } finally {
      if ((canvas as any)._currentRenderTask === renderTask) {
        (canvas as any)._currentRenderTask = null;
      }
    }

    if (url) {
      URL.revokeObjectURL(url);
      url = '';
    }
    
    try {
      await (pdf as any).destroy();
    } catch (destroyError) {
      // Safe to ignore
    }

    return true;
  } catch (error: any) {
    if (url) {
      URL.revokeObjectURL(url);
    }
    // Also check if this is a cancellation error at the promise catch level
    if (error?.name === 'RenderingCancelledException' || error?.message?.includes('cancelled')) {
      return false;
    }
    console.error('Error rendering PDF to canvas:', error);
    return false;
  }
};
