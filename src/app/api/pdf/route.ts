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
        primary: "#4c1d95",    // Deep Purple
        accent: "#6d28d9",     // Purple
        bgHeader: "#1e1e24",   // Dark Navy
        totalText: "#059669",  // Emerald
        tableHeaderBg: "#1e1e24",
        tableHeaderColor: "#ffffff",
        dividerColor: "#f3f4f6"
      };
  }
}

// Helper to compile pdf document in memory and return Buffer
function generatePDFBuffer(body: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const colors = getThemeColors(body.theme || "modern");

      // Load fonts from public folder
      const regularFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
      const boldFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");

      // Instantiate PDFDocument with Roboto as default to bypass Helvetica.afm loading
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

      // Safe date formatting
      let dateStr = "";
      let validUntilStr = "";
      try {
        const dateObj = body.client.date ? new Date(body.client.date) : new Date();
        if (isNaN(dateObj.getTime())) {
          throw new Error("Data inválida");
        }
        dateStr = dateObj.toLocaleDateString("pt-BR");
        
        const validityDate = new Date(dateObj);
        validityDate.setDate(validityDate.getDate() + (body.client.validityDays || 10));
        validUntilStr = validityDate.toLocaleDateString("pt-BR");
      } catch (err) {
        const fallbackDate = new Date();
        dateStr = fallbackDate.toLocaleDateString("pt-BR");
        const validityDate = new Date(fallbackDate);
        validityDate.setDate(validityDate.getDate() + (body.client.validityDays || 10));
        validUntilStr = validityDate.toLocaleDateString("pt-BR");
      }

      // 1. HEADER (Professional details on left, Orçamento details on right)
      let textX = 50;
      if (body.professional.logoUrl) {
        try {
          const base64Data = body.professional.logoUrl.replace(/^data:image\/\w+;base64,/, "");
          const logoBuffer = Buffer.from(base64Data, "base64");
          doc.image(logoBuffer, 50, 45, { width: 55, height: 55 });
          textX = 120;
        } catch (e) {
          console.error("Error drawing logo in Estimate PDF:", e);
        }
      }

      doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(18).text(body.professional.name, textX, 50);
      doc.fillColor("#6b7280").font("Roboto").fontSize(10).text(body.professional.title, textX, 70);
      doc.text(`${body.professional.city}  |  WhatsApp: ${body.professional.phone}`, textX, 85);

      // Document Title
      doc.fillColor(colors.primary).font("Roboto-Bold").fontSize(20).text("ORÇAMENTO", 380, 50, { width: 165, align: "right" });
      doc.fillColor("#6b7280").font("Roboto").fontSize(9).text(`Data: ${dateStr}`, 380, 75, { width: 165, align: "right" });
      doc.text(`Proposta válida até: ${validUntilStr}`, 380, 88, { width: 165, align: "right" });

      // Horizontal separator line
      doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, 115).lineTo(545, 115).stroke();

      // 2. CLIENT DETAILS
      doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(11).text("CLIENTE:", 50, 130);
      doc.fillColor("#000000").font("Roboto").fontSize(10).text(body.client.name, 110, 130);
      if (body.client.phone) {
        doc.text(`WhatsApp: ${body.client.phone}`, 110, 145);
      }

      // Horizontal separator line
      doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, 175).lineTo(545, 175).stroke();

      // 3. TABLE OF ITEMS
      let y = 195;

      // Table Header background & text
      if (colors.tableHeaderBg === "#ffffff") {
        doc.strokeColor(colors.dividerColor).lineWidth(1).moveTo(50, y).lineTo(545, y).stroke();
        doc.strokeColor(colors.dividerColor).lineWidth(1).moveTo(50, y + 20).lineTo(545, y + 20).stroke();
      } else {
        doc.fillColor(colors.tableHeaderBg).rect(50, y, 495, 20).fill();
      }
      doc.fillColor(colors.tableHeaderColor)
         .font("Roboto-Bold")
         .fontSize(9)
         .text("Descrição do Serviço / Item", 60, y + 5)
         .text("Qtd", 340, y + 5, { width: 40, align: "center" })
         .text("Preço Unit.", 390, y + 5, { width: 75, align: "right" })
         .text("Subtotal", 475, y + 5, { width: 65, align: "right" });

      y += 20;

      // Table rows
      doc.fillColor("#374151").font("Roboto").fontSize(9);
      body.items.forEach((item: any) => {
        // Draw item text
        doc.text(item.name, 60, y + 6, { width: 270 });
        doc.text(item.quantity.toString(), 340, y + 6, { width: 40, align: "center" });
        doc.text(`R$ ${item.price.toFixed(2)}`, 390, y + 6, { width: 75, align: "right" });
        doc.text(`R$ ${(item.price * item.quantity).toFixed(2)}`, 475, y + 6, { width: 65, align: "right" });

        // Draw row divider line
        doc.strokeColor(colors.dividerColor).lineWidth(0.5).moveTo(50, y + 22).lineTo(545, y + 22).stroke();
        y += 22;
      });

      y += 15; // padding after table

      // 4. SUMMARY & TERMS (drawn side by side)
      // Observações (Left)
      if (body.client.notes) {
        doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(10).text("Observações & Termos:", 50, y);
        doc.fillColor("#4b5563").font("Roboto").fontSize(8.5).text(body.client.notes, 50, y + 15, { width: 280, lineGap: 3 });
      }

      // Calculations totals block (Right)
      doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(9.5).text("Subtotal:", 360, y, { width: 100, align: "right" });
      doc.fillColor("#374151").font("Roboto").text(`R$ ${body.subtotal.toFixed(2)}`, 475, y, { width: 65, align: "right" });

      if (body.discount > 0) {
        doc.fillColor("#dc2626").font("Roboto-Bold").text("Desconto:", 360, y + 15, { width: 100, align: "right" });
        doc.text(`- R$ ${body.discount.toFixed(2)}`, 475, y + 15, { width: 65, align: "right" });
        y += 15;
      }

      doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(360, y + 18).lineTo(545, y + 18).stroke();

      doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(11.5).text("Total Geral:", 360, y + 25, { width: 100, align: "right" });
      doc.fillColor(colors.totalText).text(`R$ ${body.total.toFixed(2)}`, 475, y + 25, { width: 65, align: "right" });

      // 4.5 PIX PAYMENT BLOCK (if key is set)
      if (body.professional.pixKey) {
        try {
          y = Math.max(y + 40, body.client.notes ? (y + 60) : y);
          
          if (y > 640) {
            doc.addPage();
            y = 50;
          }

          // Separator line
          doc.strokeColor("#e5e7eb").lineWidth(0.75).moveTo(50, y).lineTo(545, y).stroke();
          y += 15;

          const pixString = generatePixPayload(
            body.professional.pixKey,
            body.professional.name,
            body.professional.city || "SAO PAULO",
            body.total,
            "ORC" + Date.now().toString().substring(8)
          );

          const qrCodeBuffer = await QRCode.toBuffer(pixString, { margin: 1, width: 65 });

          // Background card
          doc.fillColor("#f8fafc").rect(50, y, 495, 80).fill();
          doc.strokeColor("#cbd5e1").lineWidth(1).rect(50, y, 495, 80).stroke();

          // QR Code on the left of the card
          doc.image(qrCodeBuffer, 65, y + 8, { width: 64, height: 64 });

          // Payment details next to QR Code
          doc.fillColor("#0f172a").font("Roboto-Bold").fontSize(10).text("Pague com PIX:", 145, y + 10);
          doc.fillColor("#475569").font("Roboto").fontSize(8.5).text(`Beneficiário: ${body.professional.name}`, 145, y + 25);
          doc.text(`Chave Pix: ${body.professional.pixKey}`, 145, y + 38);
          
          doc.fillColor("#64748b").font("Roboto-Bold").fontSize(7.5).text("Copia e Cola:", 145, y + 54);
          doc.fillColor("#0f172a").font("Roboto").fontSize(7).text(pixString, 145, y + 64, { width: 380, lineBreak: false });
        } catch (pixErr) {
          console.error("Error generating PIX QR Code inside PDF:", pixErr);
        }
      }

      // 4.8 SIGNATURE (if provided)
      if (body.signatureBase64) {
        try {
          const sigY = 650;
          const sigData = body.signatureBase64.replace(/^data:image\/\w+;base64,/, "");
          const sigBuffer = Buffer.from(sigData, "base64");
          doc.image(sigBuffer, 222.5, sigY - 35, { width: 150, height: 35 });
          doc.strokeColor("#9ca3af").lineWidth(0.75).moveTo(197.5, sigY).lineTo(397.5, sigY).stroke();
          doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(9).text(body.professional.name, 50, sigY + 5, { align: "center", width: 495 });
          doc.fillColor("#6b7280").font("Roboto").fontSize(8).text("Assinatura do Profissional", 50, sigY + 16, { align: "center", width: 495 });
        } catch (e) {
          console.error("Error drawing signature in PDF:", e);
        }
      }

      // 5. FOOTER (Static at bottom of A4)
      doc.strokeColor("#e5e7eb").lineWidth(0.5).moveTo(50, 745).lineTo(545, 745).stroke();
      doc.fillColor("#9ca3af")
         .font("Roboto")
         .fontSize(8)
         .text("Este documento é uma proposta comercial gerada na Central do Autônomo (central.me)", 50, 755, { align: "center", width: 495 });

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
    if (!body.professional || !body.client || !body.items || typeof body.total !== "number") {
      return NextResponse.json(
        { error: "Dados incompletos para a geração do PDF." },
        { status: 400 }
      );
    }

    const buffer = await generatePDFBuffer(body);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=orcamento.pdf",
      },
    });
  } catch (err: any) {
    console.error("PDF generation server error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor ao gerar PDF: " + err.message },
      { status: 500 }
    );
  }
}
