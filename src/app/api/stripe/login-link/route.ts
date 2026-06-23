import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acessible" as any
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stripeAccountId } = body;

    if (!stripeAccountId) {
      return NextResponse.json({ error: "ID da conta Stripe é obrigatório." }, { status: 400 });
    }

    // Criar link de login de dose única para o dashboard Express do profissional
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
    return NextResponse.json({ url: loginLink.url });
  } catch (error: any) {
    console.error("Erro ao criar link de login da Stripe:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}
