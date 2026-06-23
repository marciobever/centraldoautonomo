"use client";
 
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { 
  mockProfessionals, 
  Professional 
} from "@/data/mockData";
import { PROFESSIONAL_CATEGORIES } from "@/data/categories";
import { getAllProfessionals } from "@/lib/dbBridge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
 
export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedCity, setSelectedCity] = useState("Todas");
  const [professionalsList, setProfessionalsList] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [directoryTab, setDirectoryTab] = useState<"servicos" | "produtos">("servicos");

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("relevancia");
  const categoryScrollRef = useRef<HTMLDivElement>(null);
 
  const categories = ["Todos", ...Array.from(new Set(professionalsList.map((p) => p.category).filter(Boolean))).sort()];

  const checkScrollPosition = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200;
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllProfessionals();
        if (data && data.length > 0) {
          setProfessionalsList(data);
        } else {
          setProfessionalsList(mockProfessionals);
        }
      } catch (err) {
        console.error("Erro ao carregar profissionais:", err);
        setProfessionalsList(mockProfessionals);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkScrollPosition, 150);
    window.addEventListener("resize", checkScrollPosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScrollPosition);
    };
  }, [professionalsList]);

  const cities = Array.from(
    new Set(professionalsList.map((p) => p.city).filter(Boolean))
  ).sort();
 
  // Dynamically filter matching professionals
  const filteredProfs = professionalsList
    .filter((prof) => {
      const matchesSearch = searchQuery
        ? prof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prof.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prof.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prof.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prof.bio.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const matchesCategory = selectedCategory === "Todos" 
        ? true 
        : prof.category === selectedCategory;

      const matchesCity = selectedCity === "Todas" 
        ? true 
        : prof.city === selectedCity;

      const matchesRating = prof.rating >= minRating;

      return matchesSearch && matchesCategory && matchesCity && matchesRating;
    })
    .sort((a, b) => {
      if (sortBy === "nota") {
        return b.rating - a.rating;
      }
      if (sortBy === "avaliacoes") {
        return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      }
      if (sortBy === "nome") {
        return a.name.localeCompare(b.name, "pt-BR");
      }
      return 0;
    });

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const scrollToDirectory = () => {
    const element = document.getElementById("directory-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const allActiveProducts = filteredProfs.flatMap(prof => 
    (prof.products || [])
      .filter(p => p.status === "ativo")
      .map(p => ({ ...p, professional: prof }))
  );

  return (
    <>
      <Header />

      <main className={styles.container}>
        {/* Hero Area */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot}></span>
            <span>Profissionais locais verificados</span>
          </div>
          <h1 className={`${styles.heroTitle} text-gradient`}>
            <span>Encontre profissionais</span>
            <span className="premiumSerif">de excelência</span>
            <span>perto de você</span>
          </h1>
          <p className={styles.heroDesc}>
            Explore portfólios, confira preços transparentes e contrate sem intermediários. Direto e sem taxas.
          </p>

          {/* Search Bar */}
          <div className={styles.searchWrapper}>
            <div className={styles.searchBar}>
              <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Busque por pintor, manicure..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <div className={styles.searchDivider}></div>
              <div className={styles.citySelector}>
                <svg className={styles.cityIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className={styles.citySelect}
                  aria-label="Filtrar por Cidade"
                >
                  <option value="Todas">Todas as cidades</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Filters Row */}
            <div className={styles.filtersRow}>
              <div className={styles.filterPill}>
                <span className={styles.filterLabel}>Nota mínima</span>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value) || 0)}
                  className={styles.filterSelect}
                >
                  <option value="0">Qualquer</option>
                  <option value="4">⭐ 4.0+</option>
                  <option value="4.5">⭐ 4.5+</option>
                  <option value="4.8">⭐ 4.8+</option>
                </select>
              </div>

              <div className={styles.filterPill}>
                <span className={styles.filterLabel}>Ordenar por</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="relevancia">Relevância</option>
                  <option value="nota">Melhor nota</option>
                  <option value="avaliacoes">Mais avaliados</option>
                  <option value="nome">Nome A–Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Categories Slider */}
          <div className={`${styles.categoriesContainer} ${showLeftArrow ? styles.hasLeftFade : ""} ${showRightArrow ? styles.hasRightFade : ""}`}>
            {showLeftArrow && (
              <button 
                className={`${styles.scrollArrow} ${styles.leftArrow}`} 
                onClick={() => scrollCategories("left")}
                aria-label="Rolar categorias para esquerda"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            )}
            
            <div 
              ref={categoryScrollRef}
              onScroll={checkScrollPosition}
              className={styles.categoryScroll}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`${styles.categoryChip} ${
                    selectedCategory === cat ? styles.activeChip : ""
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {showRightArrow && (
              <button 
                className={`${styles.scrollArrow} ${styles.rightArrow}`} 
                onClick={() => scrollCategories("right")}
                aria-label="Rolar categorias para direita"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            )}
          </div>

          {/* Scroll Down Indicator */}
          <div 
            className={styles.scrollIndicator} 
            onClick={scrollToDirectory}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                scrollToDirectory();
              }
            }}
            aria-label="Rolar para os profissionais"
          >
            <span>Explorar Profissionais</span>
            <svg 
              className={styles.scrollIcon} 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
          </div>
        </section>
        {/* Directory Grid */}
        <section id="directory-section" style={{ paddingBottom: "4rem", scrollMarginTop: "90px" }}>
          
          {/* Tab Selector: Services vs Products */}
          <div className={styles.directoryTabs}>
            <button
              type="button"
              onClick={() => setDirectoryTab("servicos")}
              className={`${styles.directoryTab} ${directoryTab === "servicos" ? styles.directoryTabActive : ""}`}
            >
              Serviços ({filteredProfs.length})
            </button>
            <button
              type="button"
              onClick={() => setDirectoryTab("produtos")}
              className={`${styles.directoryTab} ${directoryTab === "produtos" ? styles.directoryTabActive : ""}`}
            >
              Classificados ({filteredProfs.flatMap(p => p.products || []).filter(p => p.status === "ativo").length})
            </button>
          </div>

          <h2 className={styles.gridTitle}>
            {directoryTab === "servicos" 
              ? (selectedCategory === "Todos" ? "Profissionais em Destaque" : selectedCategory)
              : "Produtos e Equipamentos para Venda"
            }
          </h2>

          {loading ? (
            <div className="directory-grid">
              {[1, 2, 3].map((n) => (
                <div key={n} className={styles.card} style={{ pointerEvents: "none" }}>
                  <div className={styles.cardHeader}>
                    <div className={`${styles.skeletonShimmer}`} style={{ width: "56px", height: "56px", borderRadius: "14px" }}></div>
                    <div className={`${styles.skeletonShimmer}`} style={{ width: "52px", height: "28px", borderRadius: "8px" }}></div>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={`${styles.skeletonShimmer}`} style={{ height: "20px", width: "70%", marginBottom: "10px" }}></div>
                    <div className={`${styles.skeletonShimmer}`} style={{ height: "15px", width: "50%", marginBottom: "16px" }}></div>
                    <div className={`${styles.skeletonShimmer}`} style={{ height: "48px", width: "100%", marginBottom: "16px", borderRadius: "10px" }}></div>
                    <div className={`${styles.skeletonShimmer}`} style={{ height: "36px", width: "100%", borderRadius: "12px" }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : directoryTab === "servicos" ? (
            filteredProfs.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Nenhum profissional encontrado com os critérios de busca.</p>
              </div>
            ) : (
              <div className="directory-grid">
                {filteredProfs.map((prof) => (
                  <Link 
                    href={`/${prof.username}`} 
                    key={prof.id} 
                    className={styles.cardLink}
                  >
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div 
                          className={styles.avatar} 
                          style={{ background: prof.avatarColor }}
                        >
                          {getInitials(prof.name)}
                        </div>
                        <div className={styles.rating}>
                          <svg className={styles.starIcon} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                          <span>{prof.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className={styles.cardContent}>
                        <h3 className={styles.profName}>{prof.name}</h3>
                        <p className={styles.profTitle}>{prof.title}</p>
                        <p className={styles.profBio}>{prof.bio}</p>

                        {/* Services preview on directory card */}
                        {prof.services && prof.services.length > 0 && (
                          <div style={{ marginTop: "0.8rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.8rem" }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>🛠️ Serviços em Destaque</span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.3rem" }}>
                              {prof.services.slice(0, 2).map(s => (
                                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }}>{s.name}</span>
                                  <strong style={{ color: "var(--foreground)", marginLeft: "0.5rem", flexShrink: 0 }}>R$ {s.price.toFixed(0)}/{s.unit}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Products / OLX preview on directory card */}
                        {prof.products && prof.products.length > 0 && (
                          <div style={{ marginTop: "0.8rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.8rem" }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>📦 Classificados / Vendas</span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.3rem" }}>
                              {prof.products.filter(p => p.status === "ativo").slice(0, 2).map(p => (
                                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }}>{p.name}</span>
                                  <strong style={{ color: "var(--success)", marginLeft: "0.5rem", flexShrink: 0 }}>R$ {p.price.toFixed(0)}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className={styles.cardMeta} style={{ marginTop: "1rem" }}>
                          <span className={styles.badge}>{prof.city}</span>
                          <span className={`${styles.badge} ${styles.badgeCategory}`}>
                            {prof.category}
                          </span>
                        </div>

                        <div className={styles.viewProfileBtn} style={{ marginTop: "1rem" }}>
                          <span>Ver Portfólio</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            allActiveProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Nenhum anúncio de produto ativo encontrado com os critérios de busca.</p>
              </div>
            ) : (
              <div className="directory-grid">
                {allActiveProducts.map((prod) => (
                  <Link 
                    key={prod.id} 
                    href={`/${prod.professional.username}?produto=${prod.id}`}
                    className={styles.cardLink}
                  >
                    <div className={styles.card} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
                      <div>
                        {/* Product Visual Header */}
                        <div 
                          style={{ 
                            height: "140px", 
                            borderRadius: "14px", 
                            background: prod.imageColor || "linear-gradient(135deg, var(--primary-glow), oklch(12% 0.01 260))", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            fontSize: "2.5rem", 
                            marginBottom: "1.2rem",
                            position: "relative",
                            border: "1px solid var(--border-color)",
                            overflow: "hidden"
                          }}
                        >
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div className={styles.productImgPlaceholder}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                                <line x1="12" y1="12" x2="12" y2="16"/>
                                <line x1="10" y1="14" x2="14" y2="14"/>
                              </svg>
                              <span>Sem foto</span>
                            </div>
                          )}
                          <span 
                            style={{ 
                              position: "absolute", 
                              bottom: "10px", 
                              right: "10px", 
                              background: "var(--success)", 
                              color: "#ffffff", 
                              padding: "0.3rem 0.75rem", 
                              borderRadius: "8px", 
                              fontSize: "0.85rem", 
                              fontWeight: 800,
                              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                              zIndex: 2
                            }}
                          >
                            R$ {prod.price.toFixed(2)}
                          </span>
                        </div>

                        <h3 className={styles.profName} style={{ fontSize: "1.15rem", marginBottom: "0.25rem" }}>{prod.name}</h3>
                        
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.6rem" }}>
                          {prod.condition && (
                            <span style={{ fontSize: "0.65rem", background: "rgba(var(--primary-rgb), 0.12)", color: "var(--primary)", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                              ✨ {conditionLabels[prod.condition] || prod.condition}
                            </span>
                          )}
                          {prod.category && (
                            <span style={{ fontSize: "0.65rem", background: "var(--border-color)", color: "var(--foreground-muted)", padding: "1px 5px", borderRadius: "3px" }}>
                              📁 {categoryLabels[prod.category] || prod.category}
                            </span>
                          )}
                        </div>
                        
                        {/* Seller Info */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                          <div 
                            style={{ 
                              width: "20px", 
                              height: "20px", 
                              borderRadius: "50%", 
                              background: prod.professional.avatarColor, 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              fontSize: "0.45rem",
                              color: "#ffffff",
                              fontWeight: 800
                            }}
                          >
                            {getInitials(prod.professional.name)}
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                            Por: <strong>{prod.professional.name}</strong>
                          </span>
                        </div>

                        <p className={styles.profBio} style={{ fontSize: "0.85rem", WebkitLineClamp: 3 }}>
                          {prod.description}
                        </p>
                      </div>

                      <div style={{ marginTop: "1rem" }}>
                        <div className={styles.cardMeta} style={{ marginBottom: "1rem" }}>
                          <span className={styles.badge}>{prod.location || prod.professional.city}</span>
                          <span className={`${styles.badge} ${styles.badgeCategory}`}>{prod.professional.category}</span>
                        </div>

                        <div 
                          className={styles.viewProfileBtn}
                          style={{ width: "100%", justifyContent: "center" }}
                        >
                          <span>Tenho Interesse</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </section>

        {/* CTA Section */}
        <section className={styles.ctaWrapper}>
          <div className={styles.cta}>
            <h2 className={`${styles.ctaTitle} text-gradient-accent`}>Você é profissional autônomo?</h2>
            <p className={styles.ctaDesc}>
              Divulgue seu trabalho com uma página exclusiva, gerencie seus contatos e envie orçamentos profissionais em PDF direto pelo celular. 
              Suba o nível do seu negócio e <strong>feche mais serviços hoje mesmo</strong>.
            </p>
            <Link href="/dashboard" className={`${styles.ctaBtn} btn-glow`}>
              Criar Minha Página Grátis
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}


