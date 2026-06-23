import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

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

// Portuguese Numbers to Words for Currency (Short helper specific to Contract)
function numeroPorExtensoReais(valor: number): string {
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
      if (c === 1 && (d > 0 || u > 0)) partes.push("cento");
      else partes.push(centenas[c]);
    }
    if (d > 0) {
      if (d === 1) {
        partes.push(dezenas10[u]);
        return partes.join(" e ");
      } else {
        partes.push(dezenas[d]);
      }
    }
    if (u > 0) partes.push(unidades[u]);
    return partes.join(" e ");
  }

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  let partesReais: string[] = [];
  const milhares = Math.floor(inteiro / 1000);
  const restoReais = inteiro % 1000;

  if (milhares > 0) {
    if (milhares === 1) partesReais.push("mil");
    else partesReais.push(tresDigitos(milhares) + " mil");
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

// Helper to compile contract PDF in memory
function generateContractPDFBuffer(body: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const colors = getThemeColors(body.theme || "modern");
      const regularFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
      const boldFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");

      const doc = new PDFDocument({ 
        margin: 60, 
        size: "A4",
        font: regularFontPath
      });

      doc.registerFont("Roboto", fs.readFileSync(regularFontPath));
      doc.registerFont("Roboto-Bold", fs.readFileSync(boldFontPath));

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const dateObj = body.client.date ? new Date(`${body.client.date}T12:00:00`) : new Date();
      const dia = dateObj.getDate();
      const meses = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
      ];
      const mesExtenso = meses[dateObj.getMonth()];
      const ano = dateObj.getFullYear();

      // TITLE
      doc.fillColor(colors.primary).font("Roboto-Bold").fontSize(15).text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", { align: "center" });
      doc.moveDown(1.5);

      // PREAMBLE
      doc.fillColor("#1e1e24").font("Roboto-Bold").fontSize(10).text("INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS");
      doc.moveDown(0.5);

      const preambleText = `De um lado, como CONTRATADA, ${body.professional.name.toUpperCase()}, prestador(a) de serviços na área de ${body.professional.category}, residente e domiciliado(a) na cidade de ${body.professional.city}, com contato via WhatsApp pelo número ${body.professional.phone}.

De outro lado, como CONTRATANTE, ${body.client.name.toUpperCase()}, residente e domiciliado(a) no endereço do local de execução dos serviços, com contato via telefone/WhatsApp pelo número ${body.client.phone || "Não informado"}.

As partes identificadas acima celebram o presente contrato, que se regerá pelas seguintes cláusulas e condições de comum acordo:`;

      doc.font("Roboto").fontSize(9.5).text(preambleText, { align: "justify", lineGap: 3 });
      doc.moveDown(1.5);

      // CLAUSE 1
      doc.fillColor(colors.primary).font("Roboto-Bold").text("CLÁUSULA PRIMEIRA - DO OBJETO E ESPECIFICAÇÕES");
      doc.fillColor("#1e1e24").moveDown(0.4);
      doc.font("Roboto").text("O presente contrato tem como objeto a prestação dos seguintes serviços especificados:", { lineGap: 2 });
      doc.moveDown(0.3);

      // List items in contract
      body.items.forEach((item: any, idx: number) => {
        doc.font("Roboto-Bold").text(`  ${idx + 1}. ${item.name}`, { lineGap: 2 });
        doc.font("Roboto").fontSize(9).text(`     Quantidade/Fase: ${item.quantity}  |  Valor: R$ ${item.price.toFixed(2)} (Subtotal: R$ ${(item.price * item.quantity).toFixed(2)})`, { lineGap: 2 });
        doc.fontSize(9.5);
      });
      doc.moveDown(1);

      // CLAUSE 2
      doc.fillColor(colors.primary).font("Roboto-Bold").text("CLÁUSULA SEGUNDA - DO PREÇO E FORMA DE PAGAMENTO");
      doc.fillColor("#1e1e24").moveDown(0.4);
      
      let priceText = `Pela execução dos serviços descritos na Cláusula Primeira, a CONTRATANTE pagará à CONTRATADA o valor bruto total de R$ ${body.total.toFixed(2)} (${numeroPorExtensoReais(body.total)}).`;
      if (body.discount > 0) {
        priceText += ` Já deduzido o desconto concedido de R$ ${body.discount.toFixed(2)}.`;
      }
      priceText += `\n\nO pagamento será efetuado em moeda corrente nacional, preferencialmente via chave Pix ou transferência bancária conforme dados acordados diretamente entre as partes. Como sugestão de execução, recomenda-se o pagamento de 50% (cinquenta por cento) a título de sinal/entrada para início das atividades e 50% (cinquenta por cento) no ato de conclusão e entrega dos serviços.`;

      doc.font("Roboto").text(priceText, { align: "justify", lineGap: 3 });
      doc.moveDown(1);

      // CLAUSE 3
      doc.fillColor(colors.primary).font("Roboto-Bold").text("CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES E CONDIÇÕES");
      doc.fillColor("#1e1e24").moveDown(0.4);
      const obligationsText = `1. A CONTRATADA compromete-se a executar os serviços com qualidade, boa-fé e zelo profissional, respeitando os prazos estabelecidos.
2. A CONTRATANTE obriga-se a disponibilizar à CONTRATADA o acesso completo e livre ao local onde os serviços serão prestados, bem como fornecer as informações necessárias.
3. Este contrato reflete a proposta comercial apresentada na data de ${dia} de ${mesExtenso} de ${ano}, possuindo validade integral entre as partes assinadas.`;
      doc.font("Roboto").text(obligationsText, { align: "justify", lineGap: 3 });
      doc.moveDown(1);

      // CLAUSE 4
      if (body.client.notes) {
        doc.fillColor(colors.primary).font("Roboto-Bold").text("CLÁUSULA QUARTA - DAS OBSERVAÇÕES COMPLEMENTARES");
        doc.fillColor("#1e1e24").moveDown(0.4);
        doc.font("Roboto").text(body.client.notes, { align: "justify", lineGap: 3 });
        doc.moveDown(1.5);
      }

      // LOCAL & DATE
      const localDateText = `${body.professional.city.split("-")[0].trim()}, ${dia} de ${mesExtenso} de ${ano}.`;
      doc.font("Roboto").fontSize(10).text(localDateText, { align: "center" });
      doc.moveDown(3);

      // SIGNATURE LINES
      const sigY = doc.y;
      
      // Signature drawing if provided
      if (body.signatureBase64) {
        try {
          const sigData = body.signatureBase64.replace(/^data:image\/\w+;base64,/, "");
          const sigBuffer = Buffer.from(sigData, "base64");
          doc.image(sigBuffer, 80, sigY - 45, { width: 140, height: 40 });
        } catch (e) {
          console.error("Error drawing signature in Contract PDF:", e);
        }
      }

      doc.strokeColor("#9ca3af").lineWidth(0.75).moveTo(60, sigY).lineTo(240, sigY).stroke();
      doc.strokeColor("#9ca3af").lineWidth(0.75).moveTo(355, sigY).lineTo(535, sigY).stroke();

      doc.fillColor("#1e1e24").fontSize(9).font("Roboto-Bold").text("CONTRATADA (PROFISSIONAL)", 60, sigY + 8, { width: 180, align: "center" });
      doc.font("Roboto").text(body.professional.name, 60, sigY + 20, { width: 180, align: "center" });

      doc.font("Roboto-Bold").text("CONTRATANTE (CLIENTE)", 355, sigY + 8, { width: 180, align: "center" });
      doc.font("Roboto").text(body.client.name, 355, sigY + 20, { width: 180, align: "center" });

      // Footer notice
      doc.strokeColor("#e5e7eb").lineWidth(0.5).moveTo(50, 755).lineTo(545, 755).stroke();
      doc.fillColor("#9ca3af")
         .font("Roboto")
         .fontSize(8)
         .text("Contrato de prestação de serviços gerado automaticamente na Central do Autônomo (central.me)", 50, 763, { align: "center", width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.professional || !body.client || !body.items || typeof body.total !== "number") {
      return NextResponse.json(
        { error: "Dados incompletos para a geração do contrato." },
        { status: 400 }
      );
    }

    const buffer = await generateContractPDFBuffer(body);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=contrato.pdf",
      },
    });
  } catch (err: any) {
    console.error("Contract generation server error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor ao gerar contrato: " + err.message },
      { status: 500 }
    );
  }
}
