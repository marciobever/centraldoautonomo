import { Metadata } from "next";
import { getProfessional as getProfessionalRaw } from "@/lib/dbBridge";
import ProfileClient from "./ProfileClient";
import { cache } from "react";

const getProfessional = cache(getProfessionalRaw);

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { username } = await params;
  const sParams = await searchParams;
  const prof = await getProfessional(username);

  if (!prof) {
    return {
      title: "Profissional Não Encontrado | Central do Autônomo",
      description: "Este perfil profissional não foi encontrado na plataforma."
    };
  }

  // 1. Check if sharing a product
  const prodId = sParams.produto;
  if (prodId && typeof prodId === "string" && prof.products) {
    const product = prof.products.find(p => p.id === prodId);
    if (product) {
      const title = `📦 ${product.name} - R$ ${product.price.toFixed(2)} | ${prof.name}`;
      const desc = product.description || `Confira este produto anunciado por ${prof.name} na Central do Autônomo.`;
      const imageUrl = product.imageUrl || prof.logoUrl || "https://central.me/images/og-default.png";
      return {
        title,
        description: desc,
        openGraph: {
          title,
          description: desc,
          type: "website",
          images: [
            {
              url: imageUrl,
              width: 800,
              height: 600,
              alt: product.name
            }
          ]
        },
        twitter: {
          card: "summary_large_image",
          title,
          description: desc,
          images: [imageUrl]
        }
      };
    }
  }

  // 2. Check if sharing a service
  const svcId = sParams.servico;
  if (svcId && typeof svcId === "string" && prof.services) {
    const service = prof.services.find(s => s.id === svcId);
    if (service) {
      const title = `🛠️ ${service.name} - R$ ${service.price.toFixed(2)} / ${service.unit} | ${prof.name}`;
      const desc = service.description || `Contrate o serviço de ${service.name} com ${prof.name} na Central do Autônomo.`;
      const imageUrl = prof.logoUrl || "https://central.me/images/og-default.png";
      return {
        title,
        description: desc,
        openGraph: {
          title,
          description: desc,
          type: "website",
          images: [
            {
              url: imageUrl,
              width: 800,
              height: 600,
              alt: service.name
            }
          ]
        },
        twitter: {
          card: "summary_large_image",
          title,
          description: desc,
          images: [imageUrl]
        }
      };
    }
  }

  // 3. Default Profile Metadata
  const title = `${prof.name} - ${prof.title} | Central do Autônomo`;
  const desc = prof.bio || `Confira os serviços, fotos e produtos de ${prof.name} na Central do Autônomo. Solicite seu orçamento direto por WhatsApp.`;
  const imageUrl = prof.logoUrl || "https://central.me/images/og-default.png";
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "profile",
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: prof.name
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [imageUrl]
    }
  };
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const initialProfessional = await getProfessional(username);
  return <ProfileClient params={params} initialProfessional={initialProfessional} />;
}
