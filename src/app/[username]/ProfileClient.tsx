"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import styles from "./profile.module.css";
import { Service, Lead, Professional, Product } from "@/data/mockData";
import { getProfessional, saveLead, getReviews, saveReview, Review } from "@/lib/dbBridge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QRCode from "qrcode";

const conditionLabels: Record<string, string> = {
  novo: "Novo",
  semi_novo: "Seminovo",
  usado_excelente: "Usado - Excelente",
  usado_bom: "Usado - Bom",
  usado_marcas: "Usado - Marcas de Uso"
};

const categoryLabels: Record<string, string> = {
  ferramentas: "Ferramentas",
  materiais: "Materiais",
  decoracao: "Decoração",
  eletronicos: "Eletrônicos",
  outros: "Outros"
};

const getPatternOverlay = (type?: string, accentColor?: string) => {
  const strokeColor = accentColor || "rgba(255,255,255,0.25)";
  if (type === "geometric") {
    return (
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.25 }} fill="none">
        <path d="M-20 -20 L360 220 M10 -40 L400 180 M-60 10 L300 250" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="280" cy="50" r="40" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="280" cy="50" r="70" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />
      </svg>
    );
  }
  if (type === "mesh") {
    return (
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.12) 0%, transparent 60%), radial-gradient(circle at 90% 80%, rgba(0,0,0,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
        mixBlendMode: "overlay"
      }} />
    );
  }
  if (type === "glass") {
    return (
      <div style={{
        position: "absolute",
        inset: "10px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "12px",
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(5px)",
        pointerEvents: "none"
      }} />
    );
  }
  if (type === "border") {
    return (
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.15 }} fill="none">
        <rect x="12" y="12" width="95%" height="90%" rx="8" stroke={strokeColor} strokeWidth="1" />
      </svg>
    );
  }
  return null;
};

export default function ProfileClient({ 
  params,
  initialProfessional
}: { 
  params: Promise<{ username: string }>;
  initialProfessional?: Professional | null;
}) {
  const { username } = use(params);
  const [professional, setProfessional] = useState<Professional | null>(initialProfessional || null);
  const [loading, setLoading] = useState(!initialProfessional);

  useEffect(() => {
    if (initialProfessional && initialProfessional.username === username) {
      setProfessional(initialProfessional);
      setLoading(false);
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        const data = await getProfessional(username);
        setProfessional(data);
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [username, initialProfessional]);

  // States for modals
  const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ title: string; color?: string; imageUrl?: string } | null>(null);

  // Product states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [profileTab, setProfileTab] = useState<"servicos" | "produtos">("servicos");

  // Reviews states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Sharing states
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [shareModalData, setShareModalData] = useState<{
    isOpen: boolean;
    type: "servico" | "produto" | null;
    item: any | null;
    shareUrl: string;
  }>({
    isOpen: false,
    type: null,
    item: null,
    shareUrl: ""
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const handleShare = async (e: React.MouseEvent, type: "produto" | "servico", id: string) => {
    e.stopPropagation();
    if (!professional) return;

    const shareUrl = `${window.location.origin}${window.location.pathname}?${type}=${id}`;
    
    let itemShared = null;
    if (type === "servico") {
      itemShared = professional.services.find(s => s.id === id);
    } else {
      itemShared = professional.products?.find(p => p.id === id);
    }

    if (!itemShared) return;

    try {
      const qrData = await QRCode.toDataURL(shareUrl, {
        margin: 2,
        width: 130,
        color: {
          dark: "#1e3a8a",
          light: "#ffffff"
        }
      });
      setQrCodeDataUrl(qrData);
    } catch (err) {
      console.error("Erro ao gerar QR Code de compartilhamento:", err);
    }

    setShareModalData({
      isOpen: true,
      type,
      item: itemShared,
      shareUrl
    });
  };

  const copyShareLink = () => {
    if (!shareModalData.shareUrl) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareModalData.shareUrl).then(() => {
        setSharedId(shareModalData.item?.id || "modal");
        setTimeout(() => setSharedId(null), 2000);
      }).catch(err => {
        console.error("Erro ao copiar link:", err);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = shareModalData.shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setSharedId(shareModalData.item?.id || "modal");
        setTimeout(() => setSharedId(null), 2000);
      } catch (err) {
        console.error("Erro ao copiar link:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  // Stripe Checkout States
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutFeedback, setCheckoutFeedback] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

  const handleCheckoutStripe = async (type: "servico" | "produto") => {
    if (!professional) return;
    setCheckoutLoading(true);
    setCheckoutError("");
    
    let amount = 0;
    let description = "";
    let itemId = "";

    if (type === "servico") {
      if (!selectedService) return;
      amount = selectedService.price;
      description = selectedService.name;
      itemId = selectedService.id;
    } else {
      if (!selectedProduct) return;
      amount = selectedProduct.price;
      description = selectedProduct.name;
      itemId = selectedProduct.id;
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profId: professional.id,
          amount,
          description,
          paymentType: type,
          itemId,
          username: professional.username
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || "Erro ao gerar checkout do Stripe.");
      }
    } catch (e) {
      setCheckoutError("Erro de conexão ao gerar checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Auto-open review modal or product/service modal if query params exist
  useEffect(() => {
    if (!loading && professional && typeof window !== "undefined") {
      const queryParams = new URLSearchParams(window.location.search);
      
      const checkoutSuccess = queryParams.get("checkout_success");
      const checkoutCancel = queryParams.get("checkout_cancel");
      if (checkoutSuccess === "true") {
        setCheckoutFeedback({
          type: "success",
          message: `Pagamento realizado com sucesso! O profissional ${professional.name} foi notificado e iniciará o atendimento.`
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (checkoutCancel === "true") {
        setCheckoutFeedback({
          type: "error",
          message: "O pagamento foi cancelado pelo cliente."
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (queryParams.get("avaliar") === "true") {
        setIsReviewModalOpen(true);
      }

      const prodId = queryParams.get("produto");
      if (prodId && professional.products) {
        const prod = professional.products.find(p => p.id === prodId);
        if (prod && prod.status !== "esgotado") {
          setSelectedProduct(prod);
          setActivePhotoIdx(0);
          setIsProductModalOpen(true);
          setProfileTab("produtos");
        }
      }

      const svcId = queryParams.get("servico");
      if (svcId && professional.services) {
        const svc = professional.services.find(s => s.id === svcId);
        if (svc) {
          setSelectedService(svc);
          setIsEstimateModalOpen(true);
          setProfileTab("servicos");
        }
      }
    }
  }, [loading, professional]);

  // Form states
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Review Form states
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRating, setReviewerRating] = useState(5);
  const [reviewerComment, setReviewerComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    async function loadReviews() {
      if (professional) {
        try {
          const revs = await getReviews(professional.id);
          setReviews(revs);
        } catch (err) {
          console.error("Erro ao carregar avaliações:", err);
        }
      }
    }
    loadReviews();
  }, [professional?.id]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const openEstimateModal = (service: Service | null = null) => {
    setSelectedService(service);
    setIsEstimateModalOpen(true);
  };

  const handleEstimateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professional) return;

    const serviceName = selectedService ? selectedService.name : "Serviço Customizado";
    
    // Save lead through database bridge
    const newLead: Lead = {
      id: "lead_" + Date.now(),
      clientName,
      clientPhone,
      serviceName,
      status: "pendente",
      createdAt: new Date().toISOString(),
      notes: notes || "Solicitação de orçamento enviada pelo perfil público."
    };

    try {
      await saveLead(professional.username, newLead);
    } catch (err) {
      console.error("Failed to save lead:", err);
    }

    // Format WhatsApp message
    const message = `Olá ${professional.name}! Meu nome é ${clientName}. Gostaria de solicitar um orçamento para o serviço: "${serviceName}".\n\nDetalhes do pedido: ${notes || "Nenhum detalhe adicional"}.\n\nMeu contato: ${clientPhone}.\n\n(Enviado via Central do Autônomo)`;
    const whatsappUrl = `https://wa.me/${professional.whatsapp}?text=${encodeURIComponent(message)}`;

    // Reset form
    setClientName("");
    setClientPhone("");
    setNotes("");
    setIsEstimateModalOpen(false);

    // Open WhatsApp
    window.open(whatsappUrl, "_blank");
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professional || !selectedProduct) return;

    const newLead: Lead = {
      id: "lead_" + Date.now(),
      clientName,
      clientPhone,
      serviceName: `Produto: ${selectedProduct.name}`,
      status: "pendente",
      createdAt: new Date().toISOString(),
      notes: notes || `Tenho interesse no anúncio do produto "${selectedProduct.name}" anunciado por R$ ${selectedProduct.price.toFixed(2)}.`
    };

    try {
      await saveLead(professional.username, newLead);
    } catch (err) {
      console.error("Failed to save product lead:", err);
    }

    const message = `Olá ${professional.name}! Meu nome é ${clientName}. Estou interessado no anúncio do produto: "${selectedProduct.name}" (R$ ${selectedProduct.price.toFixed(2)}).\n\nObservação: ${notes || "Nenhuma observação"}.\n\nMeu contato: ${clientPhone}.\n\n(Enviado via Central do Autônomo)`;
    const whatsappUrl = `https://wa.me/${professional.whatsapp}?text=${encodeURIComponent(message)}`;

    setClientName("");
    setClientPhone("");
    setNotes("");
    setIsProductModalOpen(false);

    window.open(whatsappUrl, "_blank");
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professional) return;
    if (!reviewerName.trim()) {
      alert("Por favor, informe seu nome.");
      return;
    }
    if (!reviewerComment.trim()) {
      alert("Por favor, escreva um comentário.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const newReview: Review = {
        id: "rev_" + Date.now(),
        clientName: reviewerName.trim(),
        rating: reviewerRating,
        comment: reviewerComment.trim(),
        createdAt: new Date().toISOString()
      };

      await saveReview(professional.id, newReview);
      
      // Reload reviews
      const updatedReviews = [newReview, ...reviews];
      setReviews(updatedReviews);
      
      // Update local professional rating and count in state
      const count = updatedReviews.length;
      const sum = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = parseFloat((sum / count).toFixed(1));
      
      setProfessional({
        ...professional,
        rating: avg,
        reviewsCount: count
      });

      // Reset form
      setReviewerName("");
      setReviewerRating(5);
      setReviewerComment("");
      setIsReviewModalOpen(false);
      alert("Avaliação enviada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao enviar avaliação:", err);
      alert("Erro ao enviar avaliação: " + err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "60vh", gap: "1rem" }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "4px solid var(--border-color)",
              borderTopColor: "var(--primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}></div>
            <p style={{ color: "var(--foreground-muted)", fontWeight: 500 }}>Carregando perfil profissional...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!professional) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.notFoundWrapper}>
            <h1 className={`${styles.notFoundTitle} text-gradient`}>404</h1>
            <p className={styles.notFoundDesc}>Profissional não encontrado no diretório.</p>
            <Link href="/" className="btn-glow">
              Voltar para o Diretório
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.container} style={{ minHeight: "80vh", paddingTop: "2rem", paddingBottom: "4rem" }}>
      {/* Back to directory header */}
      <div className={styles.backHeader}>
        <Link href="/" className={styles.backLink}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Voltar para busca</span>
        </Link>
      </div>

      {checkoutFeedback.message && (
        <div 
          style={{ 
            maxWidth: "1200px", 
            margin: "0 auto 1.5rem auto", 
            display: "flex", 
            gap: "12px", 
            alignItems: "center",
            padding: "1rem",
            borderRadius: "10px",
            border: checkoutFeedback.type === "success" ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
            background: checkoutFeedback.type === "success" ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)",
            color: checkoutFeedback.type === "success" ? "#15803d" : "#b91c1c",
            fontSize: "0.95rem"
          }}
        >
          <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{checkoutFeedback.type === "success" ? "✓" : "⚠"}</span>
          <p style={{ margin: 0, fontWeight: 600 }}>{checkoutFeedback.message}</p>
          <button 
            onClick={() => setCheckoutFeedback({ type: null, message: "" })}
            style={{ 
              marginLeft: "auto", 
              background: "none", 
              border: "none", 
              cursor: "pointer", 
              fontSize: "1.2rem", 
              fontWeight: "bold",
              color: "inherit"
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Profile Info Header */}
      <section 
        className={styles.profileCardWrapper}
        style={{
          background: professional.cardDesign?.bg || "#ffffff",
          color: professional.cardDesign?.textColor || "var(--foreground)",
          border: professional.cardDesign?.accentColor ? `1px solid ${professional.cardDesign.accentColor}40` : "1px solid var(--border-color)",
          boxShadow: professional.cardDesign?.accentColor ? `0 8px 30px ${professional.cardDesign.accentColor}12` : undefined,
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Render Pattern Overlay */}
        {getPatternOverlay(professional.cardDesign?.patternType, professional.cardDesign?.accentColor)}

        <div className={styles.profileHeader} style={{ position: "relative", zIndex: 1 }}>
          <div className={styles.profileInfo}>
            <h1 className={styles.name} style={{ color: professional.cardDesign?.textColor || "var(--foreground)" }}>
              {professional.name}
            </h1>
            <p className={styles.title} style={{ color: professional.cardDesign?.accentColor || "var(--primary)" }}>
              {professional.title}
            </p>
            
            <div className={styles.metaRow}>
              <span 
                className={`${styles.badge} ${styles.badgeCategory}`}
                style={{
                  background: professional.cardDesign?.badgeBg || "rgba(var(--primary-rgb), 0.05)",
                  color: professional.cardDesign?.accentColor || "var(--primary)",
                  borderColor: professional.cardDesign?.accentColor ? `${professional.cardDesign.accentColor}40` : "var(--primary-glow)"
                }}
              >
                {professional.category}
              </span>
              <span 
                className={styles.badge}
                style={{
                  background: professional.cardDesign?.badgeBg || "var(--background-alt)",
                  color: professional.cardDesign?.textColor || "var(--foreground-muted)",
                  borderColor: professional.cardDesign?.accentColor ? `${professional.cardDesign.accentColor}30` : "var(--border-color)"
                }}
              >
                {professional.city}
              </span>
              <span className={`${styles.badge} ${styles.ratingBadge}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span>{professional.rating.toFixed(1)} ({professional.reviewsCount} avaliações)</span>
              </span>
            </div>

            <p className={styles.bio} style={{ color: professional.cardDesign?.textColor || "var(--foreground-muted)", opacity: professional.cardDesign?.textColor ? 0.9 : 1 }}>
              {professional.bio}
            </p>

            <div className={styles.actions}>
              <a 
                href={`https://wa.me/${professional.whatsapp}?text=${encodeURIComponent(`Olá ${professional.name}, vi seu perfil na Central do Autônomo e gostaria de conversar sobre um serviço.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnWhatsapp}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                Falar no WhatsApp
              </a>
              <button 
                onClick={() => openEstimateModal(null)}
                className={styles.btnEstimate}
                style={{
                  background: professional.cardDesign?.badgeBg || "var(--background-alt)",
                  borderColor: professional.cardDesign?.accentColor ? `${professional.cardDesign.accentColor}80` : "var(--border-color)",
                  color: professional.cardDesign?.textColor || "var(--foreground)"
                }}
              >
                Pedir Orçamento Grátis
              </button>
            </div>
          </div>

          <div 
            className={styles.avatarCard} 
            style={{ 
              background: professional.cardDesign?.bg || professional.avatarColor,
              color: professional.cardDesign?.textColor || "#ffffff",
              border: professional.cardDesign?.accentColor ? `2.5px solid ${professional.cardDesign.accentColor}` : "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            {getInitials(professional.name)}
          </div>
        </div>
      </section>

      {/* Gallery / Portfólio Section */}
      <section className={styles.gallerySection}>
        <h2 className={styles.sectionTitle}>Trabalhos Recentes</h2>
        <div className={styles.galleryGrid}>
          {professional.gallery.map((item, index) => (
            <div 
              key={index} 
              className={styles.galleryCard}
              onClick={() => setZoomedImage(item)}
            >
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div 
                  className={styles.galleryImageMock} 
                  style={{ 
                    background: `linear-gradient(135deg, ${item.color || 'var(--primary-glow)'}, oklch(12% 0.01 260))` 
                  }}
                />
              )}
              <div className={styles.galleryInfo}>{item.title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Service & Product Catalog Section */}
      <section className={styles.servicesSection}>
        <div className={styles.tabsContainer}>
          <button
            type="button"
            onClick={() => setProfileTab("servicos")}
            className={`${styles.tabButton} ${profileTab === "servicos" ? styles.tabButtonActive : ""}`}
          >
            🛠️ Serviços ({professional.services.length})
          </button>
          <button
            type="button"
            onClick={() => setProfileTab("produtos")}
            className={`${styles.tabButton} ${profileTab === "produtos" ? styles.tabButtonActive : ""}`}
          >
            📦 Anúncios de Produtos ({professional.products?.length || 0})
          </button>
        </div>

        <div className={styles.serviceCard}>
          {profileTab === "servicos" ? (
            professional.services.map((service) => (
              <div key={service.id} className={styles.serviceItem}>
                <div>
                  <h3 className={styles.serviceName}>{service.name}</h3>
                  <p className={styles.serviceDesc}>{service.description}</p>
                </div>
                <div className={styles.servicePrice}>
                  R$ {service.price.toFixed(2)} <span style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>/ {service.unit}</span>
                </div>
                <div className={styles.serviceAction} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button 
                    onClick={(e) => handleShare(e, "servico", service.id)}
                    className={styles.btnShareSmall}
                    title="Compartilhar serviço"
                    style={{
                      background: "rgba(var(--primary-rgb), 0.05)",
                      border: "1px solid rgba(var(--primary-rgb), 0.15)",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "var(--primary)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {sharedId === service.id ? "Copiado! ✓" : "🔗 Compartilhar"}
                  </button>
                  <button 
                    onClick={() => openEstimateModal(service)}
                    className={styles.btnOrderSmall}
                  >
                    Solicitar
                  </button>
                </div>
              </div>
            ))
          ) : (
            (!professional.products || professional.products.length === 0) ? (
              <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.9rem" }}>
                Nenhum anúncio de produto cadastrado por este profissional no momento.
              </div>
            ) : (
              professional.products.map((prod) => (
                <div 
                  key={prod.id} 
                  className={`${styles.serviceItem} ${prod.status !== "esgotado" ? styles.clickableProductItem : ""}`}
                  style={{
                    cursor: prod.status === "esgotado" ? "default" : "pointer"
                  }}
                  onClick={() => {
                    if (prod.status === "esgotado") return;
                    setSelectedProduct(prod);
                    setActivePhotoIdx(0);
                    setIsProductModalOpen(true);
                  }}
                >
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div
                      style={{
                        width: "55px",
                        height: "55px",
                        borderRadius: "10px",
                        background: prod.imageColor || "var(--primary-glow)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.3rem",
                        overflow: "hidden",
                        border: "1px solid var(--border-color)",
                        flexShrink: 0
                      }}
                    >
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        "📦"
                      )}
                    </div>
                    <div>
                      <h3 className={styles.serviceName}>{prod.name}</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", margin: "4px 0" }}>
                        {prod.condition && (
                          <span style={{ fontSize: "0.65rem", background: "rgba(var(--primary-rgb), 0.12)", color: "var(--primary)", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                            ✨ {conditionLabels[prod.condition] || prod.condition}
                          </span>
                        )}
                        {prod.location && (
                          <span style={{ fontSize: "0.65rem", background: "rgba(0,0,0,0.15)", color: "var(--foreground-muted)", padding: "1px 5px", borderRadius: "3px" }}>
                            📍 {prod.location}
                          </span>
                        )}
                      </div>
                      <p className={styles.productDesc}>{prod.description}</p>
                      {prod.status === "esgotado" && (
                        <span style={{ fontSize: "0.75rem", background: "oklch(95% 0.04 20)", color: "var(--error)", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700, marginTop: "0.2rem", display: "inline-block" }}>
                          Esgotado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.servicePrice}>
                    R$ {prod.price.toFixed(2)}
                  </div>
                  <div className={styles.serviceAction} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {prod.status !== "esgotado" && (
                      <button 
                        onClick={(e) => handleShare(e, "produto", prod.id)}
                        className={styles.btnShareSmall}
                        title="Compartilhar produto"
                        style={{
                          background: "rgba(var(--primary-rgb), 0.05)",
                          border: "1px solid rgba(var(--primary-rgb), 0.15)",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "var(--primary)",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {sharedId === prod.id ? "Copiado! ✓" : "🔗 Compartilhar"}
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (prod.status === "esgotado") return;
                        setSelectedProduct(prod);
                        setActivePhotoIdx(0);
                        setIsProductModalOpen(true);
                      }}
                      disabled={prod.status === "esgotado"}
                      className={styles.btnOrderSmall}
                      style={{
                        background: prod.status === "esgotado" ? "var(--border-color)" : "var(--primary)",
                        color: prod.status === "esgotado" ? "var(--foreground-muted)" : "#ffffff"
                      }}
                    >
                      Tenho Interesse
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </section>

      {/* Reviews Section */}
      <section className={styles.reviewsSection}>
        <div className={styles.reviewsHeader}>
          <h2 className={styles.reviewsTitle}>Avaliações dos Clientes</h2>
          <button 
            onClick={() => setIsReviewModalOpen(true)}
            className="btn-glow"
            style={{ padding: "0.6rem 1.2rem", borderRadius: "10px", fontWeight: 700 }}
          >
            Deixar uma Avaliação
          </button>
        </div>

        {reviews.length > 0 ? (
          <div className={styles.reviewsList}>
            {reviews.map((rev) => (
              <div key={rev.id} className={styles.reviewItem}>
                <div className={styles.reviewItemHeader}>
                  <div>
                    <span className={styles.reviewClient}>{rev.clientName}</span>
                    <div className={styles.starsRow} style={{ marginTop: "0.25rem" }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < rev.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                      ))}
                    </div>
                  </div>
                  <span className={styles.reviewDate}>
                    {new Date(rev.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className={styles.reviewComment}>{rev.comment}</p>
                {rev.reply && (
                  <div className={styles.reviewReply}>
                    <div className={styles.replyHeader}>
                      <span className={styles.replyTitle}>Resposta do Profissional</span>
                      <span className={styles.replyDate}>
                        {new Date(rev.repliedAt || Date.now()).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className={styles.replyText}>{rev.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--foreground-muted)", fontSize: "0.95rem" }}>
            Nenhuma avaliação ainda. Seja o primeiro a avaliar!
          </div>
        )}
      </section>

      {/* Estimate Modal Form */}
      <div 
        className="modal-overlay" 
        hidden={!isEstimateModalOpen}
        onClick={() => setIsEstimateModalOpen(false)}
      >
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h3>Solicitar Orçamento</h3>
            <button 
              onClick={() => setIsEstimateModalOpen(false)}
              className={styles.closeBtn}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Professional Information Header */}
          <div className={styles.modalProfInfo}>
            <div 
              className={styles.modalAvatar} 
              style={{ 
                background: professional.cardDesign?.bg || professional.avatarColor,
                color: professional.cardDesign?.textColor || "#ffffff"
              }}
            >
              {getInitials(professional.name)}
            </div>
            <div>
              <h4 className={styles.modalProfName}>{professional.name}</h4>
              <p className={styles.modalProfTitle}>{professional.title} • {professional.city}</p>
            </div>
          </div>

          {/* Selected Service Card */}
          {selectedService && (
            <div className={styles.modalServiceCard}>
              <div className={styles.modalServiceHeader}>
                <span className={styles.modalServiceLabel}>Serviço Selecionado</span>
                <span className={styles.modalServicePrice}>R$ {selectedService.price.toFixed(2)} / {selectedService.unit}</span>
              </div>
              <p className={styles.modalServiceName}>{selectedService.name}</p>
            </div>
          )}

          <form onSubmit={handleEstimateSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="clientName">Seu Nome</label>
              <input
                id="clientName"
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Maria da Silva"
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="clientPhone">Seu WhatsApp</label>
              <input
                id="clientPhone"
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="serviceSelect">Serviço Desejado</label>
              <select
                id="serviceSelect"
                className={styles.selectField}
                value={selectedService ? selectedService.id : ""}
                onChange={(e) => {
                  const s = professional.services.find(s => s.id === e.target.value);
                  setSelectedService(s || null);
                }}
              >
                <option value="">Serviço Personalizado / Outro</option>
                {professional.services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)} / {s.unit}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="notes">Detalhes do Serviço (Opcional)</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreva o que precisa (medidas, urgência, cores, etc.)"
                className={styles.textareaField}
              />
            </div>

            <button type="submit" className={`${styles.submitBtn} btn-glow`}>
              Enviar Proposta & Chamar no WhatsApp 💬
            </button>

            {professional.stripeAccountId && professional.stripeConnectionStatus === "completed" && selectedService && selectedService.price > 0 && (
              <>
                <div style={{ textAlign: "center", margin: "0.6rem 0" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>ou</span>
                </div>
                
                {checkoutError && (
                  <p style={{ color: "#dc2626", fontSize: "0.82rem", textAlign: "center", marginBottom: "0.5rem", fontWeight: "bold" }}>
                    ⚠ {checkoutError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => handleCheckoutStripe("servico")}
                  disabled={checkoutLoading}
                  className={`${styles.submitBtn}`}
                  style={{
                    background: "linear-gradient(135deg, #635bff, #7a73ff)",
                    borderColor: "#635bff",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%"
                  }}
                >
                  {checkoutLoading ? "Processando..." : `💳 Pagar R$ ${selectedService.price.toFixed(2)} via Cartão / Pix`}
                </button>
              </>
            )}
            
            <div style={{ textAlign: "center", margin: "0.4rem 0" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>ou</span>
            </div>

            <a
              href={`https://wa.me/${professional.whatsapp}?text=${encodeURIComponent(`Olá ${professional.name}! Gostaria de tirar uma dúvida sobre seus serviços de ${selectedService ? selectedService.name : professional.category}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnEstimate}
              style={{ 
                width: "100%", 
                padding: "0.6rem", 
                fontSize: "0.85rem", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                background: "none",
                borderColor: "var(--border-color)",
                color: "var(--primary)"
              }}
              onClick={() => setIsEstimateModalOpen(false)}
            >
              ⚡ Ir Direto para o WhatsApp (Sem preencher)
            </a>

            <p className={styles.modalHelperText} style={{ fontSize: "0.72rem", textAlign: "center", marginTop: "0.6rem", opacity: 0.85 }}>
              * Enviar a proposta registra seu contato no painel do profissional para que ele possa acompanhar seu atendimento.
            </p>
          </form>
        </div>
      </div>

      {/* Review Modal Form */}
      <div 
        className="modal-overlay" 
        hidden={!isReviewModalOpen}
        onClick={() => setIsReviewModalOpen(false)}
      >
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h3>Deixar uma Avaliação</h3>
            <button 
              onClick={() => setIsReviewModalOpen(false)}
              className={styles.closeBtn}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form onSubmit={handleReviewSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="reviewerName">Seu Nome</label>
              <input
                id="reviewerName"
                type="text"
                required
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Ex: João Silva"
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Sua Nota</label>
              <div className={styles.ratingSelectRow} style={{ marginTop: "0.25rem" }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const ratingValue = i + 1;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReviewerRating(ratingValue)}
                      className={`${styles.starBtn} ${ratingValue <= reviewerRating ? styles.starBtnActive : ""}`}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="reviewerComment">Seu Comentário</label>
              <textarea
                id="reviewerComment"
                required
                value={reviewerComment}
                onChange={(e) => setReviewerComment(e.target.value)}
                placeholder="Conte como foi sua experiência com o profissional..."
                className={styles.textareaField}
                style={{ minHeight: "100px" }}
              />
            </div>

            <button type="submit" disabled={isSubmittingReview} className={`${styles.submitBtn} btn-glow`}>
              {isSubmittingReview ? "Enviando..." : "Enviar Avaliação"}
            </button>
          </form>
        </div>
      </div>

      {/* Product Inquiry Modal Form */}
      <div 
        className="modal-overlay" 
        hidden={!isProductModalOpen}
        onClick={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
      >
        <div 
          className={`modal-content ${styles.modalContentWide}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <h3>Detalhes do Produto</h3>
              {selectedProduct && (
                <button 
                  onClick={(e) => handleShare(e, "produto", selectedProduct.id)}
                  style={{
                    background: "rgba(var(--primary-rgb), 0.05)",
                    border: "1px solid rgba(var(--primary-rgb), 0.15)",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    fontSize: "0.75rem",
                    color: "var(--primary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  {sharedId === selectedProduct.id ? "Copiado! ✓" : "🔗 Compartilhar"}
                </button>
              )}
            </div>
            <button 
              onClick={() => {
                setIsProductModalOpen(false);
                setSelectedProduct(null);
              }}
              className={styles.closeBtn}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {selectedProduct && (
            <div className={styles.productModalSplit}>
              {/* Left Column: Product Data & Images */}
              <div className={styles.productModalLeft}>
                {/* Product Gallery in Modal */}
                {selectedProduct.imageUrls && selectedProduct.imageUrls.length > 0 ? (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <div
                      style={{
                        width: "100%",
                        height: "240px",
                        borderRadius: "14px",
                        background: selectedProduct.imageColor || "var(--primary-glow)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        border: "1px solid var(--border-color)",
                        position: "relative",
                        marginBottom: "0.8rem"
                      }}
                    >
                      <img 
                        src={selectedProduct.imageUrls[activePhotoIdx] || selectedProduct.imageUrl} 
                        alt={selectedProduct.name} 
                        style={{ width: "100%", height: "100%", objectFit: "contain", background: "rgba(0,0,0,0.05)" }} 
                      />
                      {/* Left Arrow */}
                      {selectedProduct.imageUrls && selectedProduct.imageUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setActivePhotoIdx(prev => (prev === 0 ? (selectedProduct.imageUrls?.length || 1) - 1 : prev - 1))}
                          style={{
                            position: "absolute",
                            left: "8px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "rgba(0,0,0,0.4)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "32px",
                            height: "32px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                            zIndex: 2,
                            transition: "background 0.2s"
                          }}
                        >
                          ‹
                        </button>
                      )}
                      {/* Right Arrow */}
                      {selectedProduct.imageUrls && selectedProduct.imageUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setActivePhotoIdx(prev => (prev === (selectedProduct.imageUrls?.length || 1) - 1 ? 0 : prev + 1))}
                          style={{
                            position: "absolute",
                            right: "8px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "rgba(0,0,0,0.4)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "32px",
                            height: "32px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                            zIndex: 2,
                            transition: "background 0.2s"
                          }}
                        >
                          ›
                        </button>
                      )}
                    </div>
                    {/* Thumbnails Row */}
                    {selectedProduct.imageUrls.length > 1 && (
                      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", marginBottom: "0.5rem" }}>
                        {selectedProduct.imageUrls.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePhotoIdx(idx)}
                            style={{
                              width: "50px",
                              height: "50px",
                              borderRadius: "8px",
                              overflow: "hidden",
                              border: activePhotoIdx === idx ? "2.5px solid var(--primary)" : "1px solid var(--border-color)",
                              cursor: "pointer",
                              padding: 0,
                              background: "none",
                              flexShrink: 0
                            }}
                          >
                            <img src={url} alt={`Thumb ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "220px",
                      borderRadius: "14px",
                      background: selectedProduct.imageColor || "var(--primary-glow)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "3.5rem",
                      color: "#ffffff",
                      overflow: "hidden",
                      border: "1px solid var(--border-color)",
                      marginBottom: "0.5rem"
                    }}
                  >
                    {selectedProduct.imageUrl ? (
                      <img src={selectedProduct.imageUrl} alt={selectedProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      "📦"
                    )}
                  </div>
                )}

                {/* Product Title, Price and Badges */}
                <div style={{ background: "var(--background-alt)", padding: "1rem", borderRadius: "14px", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.5rem" }}>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--foreground)", margin: 0 }}>{selectedProduct.name}</h4>
                    <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--primary)", whiteSpace: "nowrap" }}>R$ {selectedProduct.price.toFixed(2)}</span>
                  </div>
                  <div className={styles.productBadgesRow}>
                    {selectedProduct.condition && (
                      <span className={`${styles.productBadge} ${styles.productBadgePrimary}`}>
                        ✨ {conditionLabels[selectedProduct.condition] || selectedProduct.condition}
                      </span>
                    )}
                    {selectedProduct.category && (
                      <span className={`${styles.productBadge} ${styles.productBadgeSecondary}`}>
                        📁 {categoryLabels[selectedProduct.category] || selectedProduct.category}
                      </span>
                    )}
                    {selectedProduct.location && (
                      <span className={`${styles.productBadge} ${styles.productBadgeDark}`}>
                        📍 {selectedProduct.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Description */}
                <div>
                  <h5 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>Descrição</h5>
                  <p style={{ fontSize: "0.9rem", color: "var(--foreground)", lineHeight: "1.5", background: "rgba(0, 0, 0, 0.03)", padding: "0.8rem", borderRadius: "10px", margin: 0, whiteSpace: "pre-wrap" }}>
                    {selectedProduct.description}
                  </p>
                </div>
              </div>

              {/* Right Column: Seller & Contact Form */}
              <div className={styles.productModalRight}>
                <h5 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>Vendedor</h5>
                <div className={styles.modalProfInfo} style={{ borderBottom: "none", paddingBottom: 0, marginBottom: "0.8rem", gap: "0.6rem" }}>
                  <div 
                    className={styles.modalAvatar} 
                    style={{ 
                      background: professional.cardDesign?.bg || professional.avatarColor,
                      color: professional.cardDesign?.textColor || "#ffffff",
                      width: "36px",
                      height: "36px",
                      fontSize: "0.9rem"
                    }}
                  >
                    {getInitials(professional.name)}
                  </div>
                  <div>
                    <h4 className={styles.modalProfName} style={{ fontSize: "0.95rem" }}>{professional.name}</h4>
                    <p className={styles.modalProfTitle} style={{ fontSize: "0.75rem" }}>{professional.title} • {professional.city}</p>
                  </div>
                </div>

                <form onSubmit={handleProductSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label htmlFor="prodClientName">Seu Nome</label>
                    <input
                      id="prodClientName"
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Maria da Silva"
                      className={styles.inputField}
                      style={{ padding: "0.6rem 0.8rem", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label htmlFor="prodClientPhone">Seu WhatsApp</label>
                    <input
                      id="prodClientPhone"
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: (11) 99999-9999"
                      className={styles.inputField}
                      style={{ padding: "0.6rem 0.8rem", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label htmlFor="prodNotes">Mensagem ou Observações (Opcional)</label>
                    <textarea
                      id="prodNotes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Tenho interesse. Está disponível?"
                      className={styles.textareaField}
                      style={{ minHeight: "70px", padding: "0.6rem 0.8rem", fontSize: "0.9rem" }}
                    />
                  </div>

                  <button type="submit" className={`${styles.submitBtn} btn-glow`} style={{ width: "100%", padding: "0.7rem", fontSize: "0.9rem" }}>
                    Enviar Proposta & Chamar no WhatsApp 💬
                  </button>

                  {professional.stripeAccountId && professional.stripeConnectionStatus === "completed" && selectedProduct && selectedProduct.price > 0 && (
                    <>
                      <div style={{ textAlign: "center", margin: "0.5rem 0" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>ou</span>
                      </div>
                      
                      {checkoutError && (
                        <p style={{ color: "#dc2626", fontSize: "0.82rem", textAlign: "center", marginBottom: "0.5rem", fontWeight: "bold" }}>
                          ⚠ {checkoutError}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCheckoutStripe("produto")}
                        disabled={checkoutLoading}
                        className={`${styles.submitBtn}`}
                        style={{
                          background: "linear-gradient(135deg, #635bff, #7a73ff)",
                          borderColor: "#635bff",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "0.7rem",
                          fontSize: "0.9rem"
                        }}
                      >
                        {checkoutLoading ? "Processando..." : `💳 Comprar R$ ${selectedProduct.price.toFixed(2)} via Cartão / Pix`}
                      </button>
                    </>
                  )}
                  
                  <div style={{ textAlign: "center", margin: "0.4rem 0" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>ou</span>
                  </div>

                  <a
                    href={`https://wa.me/${professional.whatsapp}?text=${encodeURIComponent(`Olá ${professional.name}! Tenho interesse no anúncio do produto: "${selectedProduct.name}" (R$ ${selectedProduct.price.toFixed(2)}). Está disponível?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnEstimate}
                    style={{ 
                      width: "100%", 
                      padding: "0.6rem", 
                      fontSize: "0.85rem", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      background: "none",
                      borderColor: "var(--border-color)",
                      color: "var(--primary)"
                    }}
                    onClick={() => setIsProductModalOpen(false)}
                  >
                    ⚡ Ir Direto para o WhatsApp (Sem preencher)
                  </a>

                  <p className={styles.modalHelperText} style={{ fontSize: "0.72rem", textAlign: "center", marginTop: "0.6rem", opacity: 0.85 }}>
                    * Enviar a proposta registra seu contato no painel do profissional para que ele possa acompanhar seu atendimento.
                  </p>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <div 
        className="modal-overlay" 
        hidden={!shareModalData.isOpen}
        onClick={() => setShareModalData(prev => ({ ...prev, isOpen: false }))}
      >
        <div 
          className={`modal-content ${styles.shareModalContent}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h3>Compartilhar</h3>
            <button 
              onClick={() => setShareModalData(prev => ({ ...prev, isOpen: false }))}
              className={styles.closeBtn}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {shareModalData.item && professional && (
            <div className={styles.shareModalBody}>
              {/* Share Card Preview */}
              <div 
                className={styles.shareCardPreview}
                style={{
                  background: professional.cardDesign?.bg || "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                  color: professional.cardDesign?.textColor || "#1e293b"
                }}
              >
                {getPatternOverlay(professional.cardDesign?.patternType, professional.cardDesign?.accentColor)}

                <div className={styles.shareCardHeader}>
                  {professional.logoUrl ? (
                    <img 
                      src={professional.logoUrl} 
                      alt="Logo do Profissional" 
                      className={styles.shareCardHeaderLogo} 
                    />
                  ) : (
                    <div 
                      className={styles.shareCardAvatar}
                      style={{
                        background: professional.cardDesign?.bg || professional.avatarColor || "var(--primary)",
                        color: professional.cardDesign?.textColor || "#ffffff"
                      }}
                    >
                      {getInitials(professional.name)}
                    </div>
                  )}
                  <div className={styles.shareCardProfInfo}>
                    <h4 className={styles.shareCardProfName}>{professional.name}</h4>
                    <p className={styles.shareCardProfTitle} style={{ color: professional.cardDesign?.accentColor || "var(--primary)" }}>{professional.title}</p>
                  </div>
                </div>

                {shareModalData.type === "produto" && (
                  <div className={styles.shareCardImageWrapper}>
                    {shareModalData.item.imageUrl ? (
                      <img 
                        src={shareModalData.item.imageUrl} 
                        alt={shareModalData.item.name} 
                        className={styles.shareCardImage} 
                      />
                    ) : (
                      <div 
                        className={styles.shareCardImagePlaceholder}
                        style={{ background: shareModalData.item.imageColor || "var(--primary-glow)" }}
                      >
                        📦
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.shareCardMain}>
                  <span className={styles.shareCardItemType}>
                    {shareModalData.type === "servico" ? "Serviço" : "Anúncio"}
                  </span>
                  <h3 className={`${styles.shareCardItemName} premiumSerif`}>
                    {shareModalData.item.name}
                  </h3>
                  <div className={styles.shareCardPrice} style={{ color: professional.cardDesign?.accentColor || "var(--primary)" }}>
                    R$ {shareModalData.item.price.toFixed(2)}
                  </div>
                </div>

                <div className={styles.shareCardFooter}>
                  <div className={styles.shareCardQrWrapper}>
                    {qrCodeDataUrl && (
                      <img src={qrCodeDataUrl} alt="QR Code" className={styles.shareCardQrImage} />
                    )}
                  </div>
                  <span className={styles.shareCardScanText}>Escaneie para Ver Detalhes</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={styles.shareActionsSection}>
                <p className={styles.shareActionsTitle}>Compartilhar direto em</p>
                <div className={styles.shareGrid}>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Olhe só o ${shareModalData.type === "servico" ? "serviço" : "anúncio"} "${shareModalData.item.name}" de ${professional.name} por R$ ${shareModalData.item.price.toFixed(2)}: ${shareModalData.shareUrl}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.shareIconBtn} ${styles.shareWhatsapp}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966a9.774 9.774 0 0 0-6.979-2.886c-5.434 0-9.858 4.37-9.862 9.8-.001 1.77.464 3.5 1.345 5.013l-.974 3.559 3.666-.962zm10.867-7.143c-.299-.149-1.778-.878-2.053-.977-.275-.1-.475-.149-.675.15-.199.299-.775.977-.949 1.174-.175.199-.349.224-.648.075-.3-.149-1.266-.467-2.41-1.485-.89-.793-1.49-1.773-1.665-2.072-.175-.3-.019-.462.13-.611.135-.134.299-.349.449-.524.15-.175.199-.299.299-.499.1-.2.05-.375-.025-.524-.075-.15-.675-1.625-.925-2.225-.244-.588-.49-.508-.675-.518-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.024-1.05 2.5 0 1.475 1.075 2.899 1.225 3.099.15.2 2.115 3.23 5.124 4.53 1.157.5 1.954.805 2.628 1.019 1.129.359 2.157.309 2.97.188.905-.135 1.778-.726 2.027-1.397.25-.672.25-1.248.175-1.397-.075-.149-.275-.249-.575-.398z"/>
                    </svg>
                    WhatsApp
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareModalData.shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.shareIconBtn} ${styles.shareFacebook}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                    </svg>
                    Facebook
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                      shareModalData.shareUrl
                    )}&text=${encodeURIComponent(
                      `Confira o ${shareModalData.type === "servico" ? "serviço" : "anúncio"} "${shareModalData.item.name}" de ${professional.name}!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.shareIconBtn} ${styles.shareTwitter}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                    Twitter / X
                  </a>
                </div>

                <div style={{ marginTop: "0.5rem" }}>
                  <button
                    onClick={copyShareLink}
                    className={styles.copyLinkBtn}
                  >
                    {sharedId === (shareModalData.item?.id || "modal") ? (
                      <>✓ Link Copiado com Sucesso!</>
                    ) : (
                      <>🔗 Copiar Link de Compartilhamento</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Image Zoom Modal */}
      <div 
        className="modal-overlay" 
        hidden={!zoomedImage}
        onClick={() => setZoomedImage(null)}
      >
        <div 
          className="modal-content"
          style={{ maxWidth: "600px", padding: "1.5rem" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <span />
            <button 
              onClick={() => setZoomedImage(null)}
              className={styles.closeBtn}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {zoomedImage && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {zoomedImage.imageUrl ? (
                <img 
                  src={zoomedImage.imageUrl} 
                  alt={zoomedImage.title}
                  className={styles.zoomImage}
                  style={{ width: "100%", height: "auto", maxHeight: "55vh", objectFit: "contain", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "1rem" }}
                />
              ) : (
                <div 
                  className={styles.zoomImage}
                  style={{ 
                    width: "100%",
                    height: "300px",
                    borderRadius: "12px",
                    background: `linear-gradient(135deg, ${zoomedImage.color || 'var(--primary-glow)'}, oklch(12% 0.01 260))` 
                  }}
                />
              )}
              <p className={styles.zoomTitle}>{zoomedImage.title}</p>
            </div>
          )}
        </div>
      </div>
      </main>
      <Footer />
    </>
  );
}
