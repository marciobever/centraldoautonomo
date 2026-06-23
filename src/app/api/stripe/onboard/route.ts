import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getProfessionalById, saveProfessionalProfile } from "@/lib/dbBridge";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acessible" as any // Use standard API version compatible with the library
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profId } = body;

    if (!profId) {
      return NextResponse.json({ error: "ID do profissional é obrigatório." }, { status: 400 });
    }

    // 1. Obter detalhes do profissional
    const prof = await getProfessionalById(profId);
    if (!prof) {
      return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
    }

    let stripeAccountId = prof.stripeAccountId;

    // 2. Criar uma conta Stripe Express caso não exista
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "BR",
        email: profId.includes("@") ? profId : undefined,
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: prof.name,
          url: `https://centraldoautonomo.com/${prof.username}`,
          mcc: "7299", // Código MCC genérico de serviços
        },
      });
      stripeAccountId = account.id;

      // Salvar o ID da conta Stripe no banco
      await saveProfessionalProfile(profId, {
        stripeAccountId,
        stripeConnectionStatus: "pending",
      });
    }

    // 3. Criar o Account Link para redirecionamento
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/dashboard?tab=payments&stripe_refresh=true`,
      return_url: `${baseUrl}/api/stripe/callback?profId=${profId}&accountId=${stripeAccountId}`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error("Erro no Stripe onboarding:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}
