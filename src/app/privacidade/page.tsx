import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: "800px", margin: "4rem auto", padding: "0 2rem", minHeight: "60vh" }}>
        <h1 className="text-gradient" style={{ fontSize: "2.5rem", marginBottom: "1.5rem", fontWeight: 850 }}>Política de Privacidade</h1>
        <p style={{ color: "var(--foreground-muted)", marginBottom: "2rem" }}>Última atualização: 19 de Junho de 2026</p>
        
        <section style={{ display: "flex", flexDirection: "column", gap: "2rem", lineHeight: "1.7", color: "var(--foreground)" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.8rem", color: "var(--primary)" }}>1. Informações que Coletamos</h2>
            <p>Coletamos informações necessárias para a criação do portfólio do profissional, como nome completo, e-mail, número de WhatsApp para contatos de clientes, cidade de atuação, e dados dos serviços prestados. Para clientes que utilizam o formulário de lead, coletamos nome, telefone e detalhes sobre o serviço solicitado para repassar ao profissional.</p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.8rem", color: "var(--primary)" }}>2. Como Usamos as Informações</h2>
            <p>Os dados fornecidos para o perfil público são exibidos abertamente para que clientes encontrem seu trabalho. Os dados de leads coletados são transmitidos exclusivamente ao profissional selecionado para que este possa entrar em contato.</p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.8rem", color: "var(--primary)" }}>3. Compartilhamento de Dados</h2>
            <p>Nós não vendemos ou alugamos seus dados pessoais a terceiros. As informações públicas do portfólio ficam acessíveis a qualquer visitante da internet com a finalidade de captação de clientes para o profissional.</p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.8rem", color: "var(--primary)" }}>4. Seus Direitos</h2>
            <p>Os profissionais podem acessar, editar ou excluir seus dados cadastrados a qualquer momento efetuando login no seu painel privado do `/dashboard`.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
