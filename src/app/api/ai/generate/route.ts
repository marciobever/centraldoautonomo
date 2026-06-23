import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    
    // In development mode, if the API key is not configured, we return a fallback mockup text
    // to prevent the app from breaking before they add their key.
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in environment variables. Returning mock AI copy.");
      
      let fallbackText = "Descrição profissional gerada pela inteligência artificial. Foco em pontualidade, acabamento impecável e limpeza total do ambiente. Garantia de satisfação e durabilidade do serviço executado.";
      if (type === "service" && prompt?.name) {
        fallbackText = `Serviço especializado de ${prompt.name}. Realizado com ferramentas adequadas, foco em organização, limpeza pós-obra e durabilidade. Preço transparente de R$ ${prompt.price.toFixed(2)} por ${prompt.unit}.`;
      }
      
      return NextResponse.json({ 
        text: fallbackText,
        warning: "API Key do Gemini não encontrada no arquivo .env. Este é um texto de simulação." 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // gemini-2.5-flash is fast, efficient, and has a robust free tier
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let finalPrompt = "";
    if (type === "service") {
      finalPrompt = `Você é um copywriter de vendas especializado em negócios e profissionais autônomos no Brasil.
Seu objetivo é escrever uma descrição comercial e persuasiva (com exatamente 2 a 3 frases) para um serviço técnico.
Destaque profissionalismo, capricho, pontualidade e limpeza pós-obra. Escreva em português do Brasil, de forma clara, direta e acessível para clientes comuns.

Serviço: "${prompt.name}"
Valor de referência: R$ ${prompt.price.toFixed(2)} por ${prompt.unit}
Notas/ideias do profissional: "${prompt.userNotes || ""}"

Descrição comercial persuasiva (sem aspas):`;
    } else {
      finalPrompt = prompt;
    }

    const result = await model.generateContent(finalPrompt);
    const response = result.response;
    const text = response.text().trim().replace(/^"(.*)"$/, '$1'); // Removes surrounding quotes if generated

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("Gemini API generate error:", err);
    return NextResponse.json(
      { error: "Erro no servidor de IA: " + err.message },
      { status: 500 }
    );
  }
}
