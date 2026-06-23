import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { generatePixPayload } from "@/lib/pixHelper";

// Theme configuration helper
function getThemeColors(theme: string) {
  switch (theme) {
    case "classic":
      return {
        primary: "#1e3a8a",    // Navy Blue
        accent: "#2563eb",     // Royal Blue
        bgHeader: "#1e3a8a",
        totalText: "#1e3a8a",
        tableHeaderBg: "#1e3a8a",
        tableHeaderColor: "#ffffff",
        dividerColor: "#cbd5e1"
      };
    case "minimalist":
      return {
        primary: "#111827",    // Black
        accent: "#4b5563",     // Gray
        bgHeader: "#111827",
        totalText: "#111827",
        tableHeaderBg: "#ffffff",
        tableHeaderColor: "#111827",
        dividerColor: "#e5e7eb"
      };
    case "modern":
    default:
      return {
        primary: "#059669",    // Emerald (Green is classic for receipts)
        accent: "#10b981",     // Green
        bgHeader: "#1e1e24",   // Dark Navy
        totalText: "#059669",
        tableHeaderBg: "#1e1e24",
        tableHeaderColor: "#ffffff",
        dividerColor: "#f3f4f6"
      };
  }
}

// Helper to convert numbers to words in Portuguese
function numeroPorExtenso(valor: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dezenas10 = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function tresDigitos(num: number, isSingularCem = false): string {
    if (num === 0) return "";
    if (num === 100 && isSingularCem) return "cem";
    
    let c = Math.floor(num / 100);
    let d = Math.floor((num % 100) / 10);
    let u = num % 10;
    
    let partes: string[] = [];
    
    if (c > 0) {
      if (c === 1 && (d > 0 || u > 0)) {
        partes.push("cento");
      } else {
        partes.push(centenas[c]);
      }
    }
    
    if (d > 0) {
      if (d === 1) {
        partes.push(dezenas10[u]);
        return partes.join(" e ");
      } else {
        partes.push(dezenas[d]);
      }
    }
    
    if (u > 0) {
      partes.push(unidades[u]);
    }
    
    return partes.join(" e ");
  }

  if (valor === 0) return "zero reais";

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  let partesReais: string[] = [];

  const milhares = Math.floor(inteiro / 1000);
  const restoReais = inteiro % 1000;

  if (milhares > 0) {
    if (milhares === 1) {
      partesReais.push("mil");
    } else {
      partesReais.push(tresDigitos(milhares) + " mil");
    }
  }

  if (restoReais > 0) {
    partesReais.push(tresDigitos(restoReais, true));
  }

  let extensoReais = partesReais.join(" e ");
  let moeda = inteiro === 1 ? "real" : "reais";
  let extensoCompleto = extensoReais ? `${extensoReais} ${moeda}` : "";

  if (centavos > 0) {
    let extensoCentavos = tresDigitos(centavos);
    let moedaCentavos = centavos === 1 ? "centavo" : "centavos";
    if (extensoCompleto) {
      extensoCompleto += ` e ${extensoCentavos} ${moedaCentavos}`;
    } else {
      extensoCompleto = `${extensoCentavos} ${moedaCentavos}`;
    }
  }

  return extensoCompleto;
}

// Helper to compile pdf document in memory and return Buffer
function generateReceiptPDFBuffer(body: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const colors = getThemeColors(body.theme || "modern");

      // Load fonts from public folder
      const regularFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
      const boldFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");

      const doc = new PDFDocument({ 
        margin: 50, 
        size: "A4",
        font: regularFontPath
      });

      doc.registerFont("Roboto", fs.readFileSync(regularFontPath));
      doc.registerFont("Roboto-Bold", fs.readFileSync(boldFontPath));

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Parse Date
      let dateObj = new Date();
      if (body.date) {
        // Appending T12:00:00 to prevent timezone shift issues
        dateObj = new Date(`${body.date}T12:00:00`);
        if (isNaN(dateObj.getTime())) {
          dateObj = new Date();
        }
      }

      const dia = dateObj.getDate();
      const meses = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
      ];
      const mesExtenso = meses[dateObj.getMonth()];
      const ano = dateObj.getFullYear();

      // 1. HEADER (Professional Details)
      let textX = 50;
      if (body.professional.logoUrl) {
        try {
          const base64Data = body.professional.logoUrl.replace(/^data:image\/\w+;base64,/, "");
          const logoBuffer = Buffer.from(base64Data, "base64");
          doc.image(logoBuffer, 50, 45, { width: 55, height: 55 });
          textX = 120;
        } catch (e) {
          console.error("Error drawing logo in Receipt PDF:", e);
        }
      }

      doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(18).text(body.professional.name, textX, 50);
      doc.fillColor("#6b7280").font("Roboto").fontSize(10).text(body.professional.title, textX, 70);
      doc.text(`${body.professional.city}  |  WhatsApp: ${body.professional.phone}`, textX, 85);

      // Title
      doc.fillColor(colors.primary).font("Roboto-Bold").fontSize(22).text("RECIBO", 380, 50, { width: 165, align: "right" });
      
      // Horizontal separator line
      doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, 115).lineTo(545, 115).stroke();

      // 2. VALUE CARD
      let y = 135;
      doc.fillColor(colors.primary + "0d").rect(50, y, 495, 50).fill(); // 5% opacity
      doc.strokeColor(colors.primary).lineWidth(1.5).rect(50, y, 495, 50).stroke();

      doc.fillColor(colors.primary).font("Roboto-Bold").fontSize(12).text("VALOR:", 70, y + 18);
      doc.fontSize(20).text(`R$ ${body.value.toFixed(2)}`, 130, y + 13, { width: 395, align: "right" });

      y += 75;

      // 3. RECIBO TEXT BODY
      doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(10.5).text("RECEBI(EMOS) DE:", 50, y);
      doc.fillColor("#111827").font("Roboto").fontSize(11).text(body.clientName, 160, y, { width: 385 });

      y += 25;
      doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(10.5).text("A IMPORTÂNCIA DE:", 50, y);
      
      const extensoText = numeroPorExtenso(body.value);
      const capitalizedExtenso = extensoText.charAt(0).toUpperCase() + extensoText.slice(1);
      doc.fillColor("#111827").font("Roboto-Bold").fontSize(11).text(`* ${capitalizedExtenso} *`, 160, y, { width: 385 });

      y += 40;
      doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(10.5).text("REFERENTE A:", 50, y);
      doc.fillColor("#374151").font("Roboto").fontSize(11).text(body.referente, 160, y, { width: 385, lineGap: 4 });

      y += 80;

      // 3.5 PIX PAYMENT BLOCK (if key is set)
      if (body.professional.pixKey) {
        try {
          const pixString = generatePixPayload(
            body.professional.pixKey,
            body.professional.name,
            body.professional.city || "SAO PAULO",
            body.value,
            "REC" + Date.now().toString().substring(8)
          );

          const qrCodeBuffer = await QRCode.toBuffer(pixString, { margin: 1, width: 60 });

          // Background card
          doc.fillColor("#f8fafc").rect(50, y, 495, 75).fill();
          doc.strokeColor("#cbd5e1").lineWidth(1).rect(50, y, 495, 75).stroke();

          // QR Code on the left of the card
          doc.image(qrCodeBuffer, 65, y + 7, { width: 60, height: 60 });

          // Payment details next to QR Code
          doc.fillColor("#0f172a").font("Roboto-Bold").fontSize(9.5).text("Informações de pagamento via PIX:", 145, y + 10);
          doc.fillColor("#475569").font("Roboto").fontSize(8.5).text(`Beneficiário: ${body.professional.name}  |  Chave Pix: ${body.professional.pixKey}`, 145, y + 25);
          
          doc.fillColor("#64748b").font("Roboto-Bold").fontSize(7.5).text("Copia e Cola:", 145, y + 42);
          doc.fillColor("#0f172a").font("Roboto").fontSize(7).text(pixString, 145, y + 52, { width: 380, lineBreak: false });

          y += 95;
        } catch (pixErr) {
          console.error("Error generating PIX QR Code inside Receipt PDF:", pixErr);
        }
      }

      // 4. SIGNATURE AND LOCATION
      const locStr = `${body.professional.city.split("-")[0].trim()}, ${dia} de ${mesExtenso} de ${ano}.`;
      doc.fillColor("#1e1e24").font("Roboto").fontSize(11).text(locStr, 50, y, { align: "center", width: 495 });

      y += 90;
      
      // Signature drawing if provided
      if (body.signatureBase64) {
        try {
          const sigData = body.signatureBase64.replace(/^data:image\/\w+;base64,/, "");
          const sigBuffer = Buffer.from(sigData, "base64");
          doc.image(sigBuffer, 222.5, y - 45, { width: 150, height: 40 });
        } catch (e) {
          console.error("Error drawing signature in Receipt PDF:", e);
        }
      }

      // Signature Line
      doc.strokeColor("#9ca3af").lineWidth(0.75).moveTo(147.5, y).lineTo(397.5, y).stroke();
      doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(11).text(body.professional.name, 50, y + 8, { align: "center", width: 495 });
      doc.fillColor("#6b7280").font("Roboto").fontSize(9.5).text(body.professional.title, 50, y + 22, { align: "center", width: 495 });

      // 5. FOOTER
      doc.strokeColor("#e5e7eb").lineWidth(0.5).moveTo(50, 745).lineTo(545, 745).stroke();
      doc.fillColor("#9ca3af")
         .font("Roboto")
         .fontSize(8)
         .text("Este recibo é um comprovante emitido na Central do Autônomo (central.me)", 50, 755, { align: "center", width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.professional || !body.clientName || typeof body.value !== "number" || !body.referente) {
      return NextResponse.json(
        { error: "Dados incompletos para a geração do recibo." },
        { status: 400 }
      );
    }

    const buffer = await generateReceiptPDFBuffer(body);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=recibo.pdf",
      },
    });
  } catch (err: any) {
    console.error("Receipt generation server error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor ao gerar recibo: " + err.message },
      { status: 500 }
    );
  }
}
