import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function HelpPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: "800px", margin: "4rem auto", padding: "0 2rem", minHeight: "60vh" }}>
        <h1 className="text-gradient" style={{ fontSize: "2.5rem", marginBottom: "1.5rem", fontWeight: 850 }}>Central de Ajuda</h1>
        <p style={{ color: "var(--foreground-muted)", marginBottom: "2rem" }}>Dúvidas frequentes sobre o uso da plataforma</p>
        
        <section style={{ display: "flex", flexDirection: "column", gap: "2rem", lineHeight: "1.7", color: "var(--foreground)" }}>
          <div style={{ padding: "1.5rem", background: "#ffffff", borderRadius: "16px", border: "1px solid var(--border-color)", boxShadow: "0 2px 8px rgba(0,0,0,0.01)" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.6rem", color: "var(--primary)", fontWeight: 800 }}>Como posso cadastrar meu trabalho?</h2>
            <p>Basta acessar o painel clicando em "Acessar Painel" no topo da página, criar uma conta preenchendo seus dados profissionais (Nome, Cidade, WhatsApp, Categoria) e escolher seu link público. Seu portfólio estará online na mesma hora!</p>
          </div>

          <div style={{ padding: "1.5rem", background: "#ffffff", borderRadius: "16px", border: "1px solid var(--border-color)", boxShadow: "0 2px 8px rgba(0,0,0,0.01)" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.6rem", color: "var(--primary)", fontWeight: 800 }}>A Central do Autônomo cobra alguma taxa?</h2>
            <p>Não! A Central do Autônomo é 100% gratuita para profissionais autônomos anunciarem. Os clientes entram em contato diretamente com você pelo WhatsApp, sem comissão nem custos de intermediação.</p>
          </div>

          <div style={{ padding: "1.5rem", background: "#ffffff", borderRadius: "16px", border: "1px solid var(--border-color)", boxShadow: "0 2px 8px rgba(0,0,0,0.01)" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.6rem", color: "var(--primary)", fontWeight: 800 }}>Como funciona o gerador de orçamentos?</h2>
            <p>Dentro do seu painel privado, na aba "Orçador", você pode selecionar seus serviços do catálogo ou digitar novos itens, definir as quantidades, escolher o cliente de destino e gerar um arquivo PDF formatado e profissional na mesma hora para enviar pelo WhatsApp.</p>
          </div>

          <div style={{ padding: "1.5rem", background: "#ffffff", borderRadius: "16px", border: "1px solid var(--border-color)", boxShadow: "0 2px 8px rgba(0,0,0,0.01)" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.6rem", color: "var(--primary)", fontWeight: 800 }}>Como os clientes entram em contato comigo?</h2>
            <p>Os clientes que acessarem seu link de portfólio público podem clicar em "Solicitar Orçamento" ou "Falar no WhatsApp". Eles preenchem o formulário com o nome e o telefone, e os dados são enviados como uma mensagem pronta para o seu WhatsApp e salvos como lead no seu painel.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
