import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getProfessionalById } from "@/lib/dbBridge";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acessible" as any
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profId, amount, description, paymentType, itemId, username } = body;

    if (!profId || !amount || !description || !username) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios ausentes (profId, amount, description, username)." },
        { status: 400 }
      );
    }

    // 1. Buscar o profissional no banco para obter seu stripeAccountId
    const prof = await getProfessionalById(profId);
    if (!prof) {
      return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
    }

    if (!prof.stripeAccountId || prof.stripeConnectionStatus !== "completed") {
      return NextResponse.json(
        { error: "Este profissional ainda não configurou os recebimentos por cartão/Pix na plataforma." },
        { status: 400 }
      );
    }

    // 2. Definir a taxa de comissão da plataforma (5%)
    const platformFeePercentage = 0.05;
    const amountInCents = Math.round(amount * 100);
    const applicationFeeInCents = Math.round(amount * platformFeePercentage * 100);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // 3. Criar a sessão de Checkout do Stripe com Split (Destination Charges)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "pix"],
      payment_method_options: {
        card: {
          installments: {
            enabled: true // Habilita parcelamento de cartão de crédito no Brasil
          }
        }
      },
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: description,
              description: `Pagamento de ${paymentType === "produto" ? "produto" : "serviço"} para ${prof.name}`
            },
            unit_amount: amountInCents
          },
          quantity: 1
        }
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeInCents, // Comissão de 5% retida pela plataforma
        transfer_data: {
          destination: prof.stripeAccountId // Repasse do restante direto para o profissional
        }
      },
      success_url: `${baseUrl}/${username}?checkout_success=true&item_type=${paymentType}&item_id=${itemId || ""}`,
      cancel_url: `${baseUrl}/${username}?checkout_cancel=true`
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro ao criar sessão de checkout do Stripe:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}
