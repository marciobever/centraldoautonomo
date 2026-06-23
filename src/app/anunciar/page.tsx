"use client";

import Link from "next/link";
import styles from "./anunciar.module.css";

export default function AnunciarPage() {
  const faqItems = [
    {
      q: "Preciso baixar algum aplicativo no celular?",
      a: "Não! A Central do Autônomo é um sistema web moderno. Você consegue acessar e fazer tudo diretamente pelo navegador de qualquer celular ou computador, sem ocupar espaço na memória do seu aparelho."
    },
    {
      q: "Como os clientes entram em contato comigo?",
      a: "Os clientes acessam o seu link exclusivo (ex: central.me/seu-nome), consultam seus serviços e clicam em 'Solicitar Orçamento'. Você receberá os dados organizados no seu Painel de Leads e o cliente será redirecionado para o seu WhatsApp com a mensagem do pedido pronta!"
    },
    {
      q: "Posso testar a plataforma de graça?",
      a: "Sim! Ao acessar o painel pela primeira vez, você ganha 7 dias de acesso completo e ilimitado para criar sua página, cadastrar seus serviços e gerar orçamentos em PDF para seus clientes."
    },
    {
      q: "Como funciona a geração de PDF?",
      a: "No seu painel, você preenche um formulário simples com os dados do cliente, seleciona os serviços que vai fazer e clica em 'Emitir Orçamento'. O nosso servidor gera um documento PDF profissional com seus dados e logomarca, que você baixa na hora e envia para o cliente."
    },
    {
      q: "Posso cancelar minha assinatura quando quiser?",
      a: "Com certeza. A assinatura mensal não possui fidelidade. Se decidir cancelar, basta um clique no painel e nenhuma nova cobrança será feita."
    }
  ];

  return (
    <>
      {/* Header */}
      <header className={`${styles.header} glass`}>
        <div className={`${styles.container} styles.navContent`}>
          <div className={styles.navContent}>
            <Link href="/" className={styles.logo}>
              <svg className={styles.logoIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.886L4.2 9.2l4.8 4.186L7.088 19.5 12 16l4.912 3.5-1.912-6.114 4.8-4.186-5.888-.314L12 3z"/>
              </svg>
              <span>Central do Autônomo</span>
            </Link>
            <Link href="/dashboard" className={styles.loginBtn}>
              Entrar no Painel
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot}></span>
            <span>Feito para Prestadores de Serviços e Autônomos</span>
          </div>
          
          <h1 className={styles.heroTitle}>
            Tenha sua própria página de vendas e
            <span>emita PDFs profissionais em 1 minuto</span>
          </h1>
          
          <p className={styles.heroDesc}>
            A ferramenta mais simples do mercado para autônomos divulgarem seus serviços, organizarem pedidos e enviarem propostas impecáveis direto pelo celular.
          </p>
          
          <Link href="/dashboard" className="btn-glow">
            Criar Minha Página Grátis
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </Link>
        </section>

        {/* Features Section */}
        <section className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>Tudo o que você precisa para crescer</h2>
          
          <div className={styles.featuresGrid}>
            {/* Feature 1 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </div>
              <h3>Seu Link Profissional</h3>
              <p>Ganhe uma página exclusiva na internet com seu nome, resumo, fotos de trabalhos e tabela de preços para colocar na bio do seu Instagram ou enviar aos clientes.</p>
            </div>

            {/* Feature 2 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h3>Orçamentos em PDF</h3>
              <p>Esqueça mensagens de texto bagunçadas. Preencha as informações do cliente, clique em um botão e envie propostas com design limpo direto pelo WhatsApp.</p>
            </div>

            {/* Feature 3 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3>Controle de Pedidos</h3>
              <p>Um mini-painel (CRM) simplificado onde você visualiza quem pediu orçamento, o contato do cliente, o serviço solicitado e gerencia o status da negociação.</p>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className={styles.stepsSection}>
          <h2 className={styles.sectionTitle}>Como funciona? É muito simples:</h2>
          
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <h4>Monte sua Página</h4>
              <p>Cadastre seus dados e insira seus principais serviços com os preços de referência.</p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <h4>Divulgue o seu Link</h4>
              <p>Coloque seu link exclusivo na bio do Instagram ou envie para potenciais clientes que te procuram.</p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <h4>Fature Mais</h4>
              <p>Receba solicitações organizadas de orçamento e emita PDFs profissionais para fechar o negócio.</p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className={styles.pricingSection}>
          <h2 className={styles.sectionTitle}>Planos simples, sem taxas ocultas</h2>
          
          <div className={styles.pricingGrid}>
            {/* Plan 1 */}
            <div className={styles.pricingCard}>
              <h3 className={styles.planName}>Plano Mensal</h3>
              <div className={styles.planPrice}>R$ 19,90<span>/mês</span></div>
              
              <ul className={styles.planFeatures}>
                <li>
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Link profissional exclusivo
                </li>
                <li>
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Catálogo de serviços ilimitados
                </li>
                <li>
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Geração de PDFs ilimitada
                </li>
                <li>
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Painel de contatos e leads
                </li>
              </ul>
              
              <Link href="/dashboard" className={`${styles.planBtn} ${styles.planBtnSecondary} btn-glow`}>
                Começar Grátis
              </Link>
            </div>

            {/* Plan 2 */}
            <div className={`${styles.pricingCard} ${styles.popularCard}`}>
              <div className={styles.popularBadge}>MELHOR CUSTO-BENEFÍCIO</div>
              <h3 className={styles.planName}>Plano Anual</h3>
              <div className={styles.planPrice}>R$ 149,00<span>/ano</span></div>
              
              <ul className={styles.planFeatures}>
                <li>
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Todos os recursos inclusos
                </li>
                <li>
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Equivalente a <strong>R$ 12,40 por mês</strong>
                </li>
                <li>
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Economia de 37% sobre o mensal
                </li>
                <li>
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Suporte prioritário por WhatsApp
                </li>
              </ul>
              
              <Link href="/dashboard" className={`${styles.planBtn} btn-glow`}>
                Garantir Anual Grátis
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className={styles.faqSection}>
          <h2 className={styles.sectionTitle}>Perguntas Frequentes</h2>
          
          <div className={styles.faqList}>
            {faqItems.map((item, index) => (
              <details key={index} className={styles.faqItem}>
                <summary>{item.q}</summary>
                <div className={styles.faqContent}>
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>© {new Date().getFullYear()} Central do Autônomo. Desenvolvido para impulsionar a economia real de quem trabalha na ponta.</p>
        </div>
      </footer>
    </>
  );
}
