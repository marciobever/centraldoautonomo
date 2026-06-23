import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { saveProfessionalProfile } from "@/lib/dbBridge";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acessible" as any
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profId = searchParams.get("profId");
  const accountId = searchParams.get("accountId");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (!profId || !accountId) {
    return NextResponse.redirect(`${baseUrl}/dashboard?tab=payments&stripe_error=missing_params`);
  }

  try {
    // 1. Consultar o status da conta conectada na Stripe
    const account = await stripe.accounts.retrieve(accountId);

    if (account.details_submitted) {
      // 2. Onboarding concluído com sucesso
      await saveProfessionalProfile(profId, {
        stripeAccountId: accountId,
        stripeConnectionStatus: "completed"
      });
      return NextResponse.redirect(`${baseUrl}/dashboard?tab=payments&stripe_success=true`);
    } else {
      // Onboarding incompleto
      return NextResponse.redirect(`${baseUrl}/dashboard?tab=payments&stripe_error=details_not_submitted`);
    }
  } catch (error: any) {
    console.error("Erro no callback do Stripe onboarding:", error);
    return NextResponse.redirect(`${baseUrl}/dashboard?tab=payments&stripe_error=api_error`);
  }
}
