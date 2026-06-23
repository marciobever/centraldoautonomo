import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: "800px", margin: "4rem auto", padding: "0 2rem", minHeight: "60vh" }}>
        <h1 className="text-gradient" style={{ fontSize: "2.5rem", marginBottom: "1.5rem", fontWeight: 850 }}>Termos de Uso</h1>
        <p style={{ color: "var(--foreground-muted)", marginBottom: "2rem" }}>Última atualização: 19 de Junho de 2026</p>
        
        <section style={{ display: "flex", flexDirection: "column", gap: "2rem", lineHeight: "1.7", color: "var(--foreground)" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.8rem", color: "var(--primary)" }}>1. Aceitação dos Termos</h2>
            <p>Ao acessar e utilizar a <strong>Central do Autônomo</strong>, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concorda com qualquer parte destes termos, não deve utilizar nossos serviços.</p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.8rem", color: "var(--primary)" }}>2. Descrição do Serviço</h2>
            <p>A Central do Autônomo funciona como um catálogo público de profissionais autônomos e gerador de orçamentos. Não participamos de transações financeiras, negociações ou intermediações entre clientes e prestadores de serviços. Toda a comunicação, orçamento e execução do trabalho são de responsabilidade direta das partes envolvidas.</p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.8rem", color: "var(--primary)" }}>3. Cadastro e Segurança</h2>
            <p>Para criar seu portfólio no painel, o profissional autônomo deve fornecer informações verídicas e atualizadas. A segurança da conta (login e senha) é de responsabilidade exclusiva do usuário.</p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.8rem", color: "var(--primary)" }}>4. Limitação de Responsabilidade</h2>
            <p>A plataforma não se responsabiliza por eventuais perdas, danos, atrasos ou falhas decorrentes de serviços contratados a partir do catálogo de profissionais públicos, nem por erros nas informações enviadas nos orçamentos em PDF gerados.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
