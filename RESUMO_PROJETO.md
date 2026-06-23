# Central do Autônomo - Resumo Geral do Projeto & Transição

Este documento detalha o estado atual do projeto **Central do Autônomo**, sua arquitetura, todas as funcionalidades desenvolvidas e o passo a passo para configurar e rodar o projeto do zero ao migrar para um novo computador.

---

## 🚀 Arquitetura & Tecnologias Principais

* **Framework:** Next.js 16 (App Router) + React 19 + TypeScript.
* **Estilização:** Vanilla CSS (CSS Modules) para flexibilidade e design premium customizado.
* **Banco de Dados & Autenticação:** Firebase Auth e Cloud Firestore (Banco NoSQL em tempo real).
* **Armazenamento de Mídias (Imagens):** Migrado de Base64 para **S3-Compatible (MinIO da VPS)** via rota de API interna.
* **Inteligência Artificial:** Gemini 2.5 Flash via Google AI Studio API (melhoria automática de Biografia).
* **Pagamentos & Onboarding:** Stripe Connect (Express) para fluxo completo de orçamentos e recebimento de autônomos.
* **Ferramentas Extras:** `qrcode` (geração de QR code dinâmico para compartilhamento) e `pdfkit` (geração de orçamentos e recibos profissionais em PDF).

---

## 🛠️ Funcionalidades Desenvolvidas

### 1. Painel Administrativo do Profissional (`/dashboard`)
* **Início (Insights):** Gráficos e cards de faturamento, novos leads e agenda de compromissos.
* **Minha Agenda:** Calendário interativo para agendar e acompanhar atendimentos de clientes.
* **Meus Leads:** Gestão de contatos recebidos de clientes interessados, com status de conversão.
* **Orçador & Recibos:** Criação de orçamentos e recibos customizados com download direto em **PDF**, incluindo o Logotipo do profissional e Chave Pix para pagamento via QR Code.
* **Minhas Finanças:** Lançamento de despesas e controle financeiro simplificado.
* **Catálogo de Serviços & Produtos:** Cadastro e edição de serviços e produtos para venda.
* **Design do Cartão:** Customização de cores, gradientes mesh dinâmicos e padrões de fundo para o Cartão Digital 3D.
* **Integração Stripe:** Botão de onboarding e redirecionamento direto para a conta Stripe Express.

### 2. Perfil Público do Profissional (`/[username]`)
* **Visual Premium Light Mode:** Combinação das fontes *Lora* (serifada clássica) e *Outfit* (moderna), fundo mesh animado via GPU, efeitos de Glassmorphism e micro-animações no hover.
* **Cartão Digital 3D:** Cartão virtual interativo que gira 360° ao passar o mouse ou tocar na tela (Frente: Dados do profissional; Verso: QR Code de contato).
* **Catálogo Público:** Exibição dos serviços cadastrados e galeria de produtos.
* **Modal de Detalhes & Checkout:** Modal detalhada para contratação com integração de pagamento (Stripe Checkout).
* **Modal de Compartilhamento:** Modal que gera um **Share Card Preview** elegante contendo nome, foto do produto/serviço, preço e um **QR Code dinâmico** que aponta diretamente para o link do item.

### 3. Sistema de Upload e Otimização de Imagens
* **Otimização Local:** Canvas local que redimensiona e compacta as imagens para JPEG de 70% de qualidade e no máximo 800x800px antes de enviar.
* **S3 Integration:** Nova rota de API segura `/api/upload` que envia as fotos diretamente para o seu bucket no **MinIO da sua VPS**, salvando a URL pública no Firestore e evitando o limite de 1MB do banco NoSQL.
* **Compatibilidade Retroativa:** Adicionado tratamento no servidor (`/[username]/page.tsx`) que detecta imagens legadas em Base64 e faz o fallback automático para a logo pública, evitando quebra nas visualizações de link do WhatsApp.

---

## 🔑 Variáveis de Ambiente Necessárias (`.env.local`)

Você precisará recriar o arquivo `.env.local` na raiz do projeto no novo computador com as seguintes variáveis de ambiente:

```env
# Chave de API do Gemini (Google AI Studio)
GEMINI_API_KEY=sua_chave_gemini_aqui

# Chaves do Firebase do projeto "Profissionais Autonomos"
NEXT_PUBLIC_FIREBASE_API_KEY=sua_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=profissionais-autonomos-5e473.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=profissionais-autonomos-5e473
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=profissionais-autonomos-5e473.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_firebase_app_id

# Configurações do Stripe Connect (Modo Teste ou Produção)
STRIPE_SECRET_KEY=sua_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=sua_stripe_publishable_key

# URL Base da Aplicação (Local e Vercel)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Configurações de Upload para a VPS (MinIO S3-Compatible)
S3_ENDPOINT=https://minio.seureview.com.br
S3_ACCESS_KEY_ID=sua_access_key_do_minio
S3_SECRET_ACCESS_KEY=sua_secret_key_do_minio
S3_BUCKET_NAME=centraldoautonomo
S3_REGION=us-east-1
```

---

## 💻 Como Configurar no Novo Computador

Siga estes passos rápidos para rodar o projeto na nova máquina:

1. **Instalar o Node.js:** Garanta que o Node.js (versão 18 ou superior) está instalado.
2. **Baixar o Código:** Clone o repositório do seu GitHub:
   ```bash
   git clone https://github.com/marciobever/centraldoautonomo.git
   cd centraldoautonomo
   ```
3. **Instalar Dependências:**
   ```bash
   npm install
   ```
4. **Instalar o SDK do S3 (caso não tenha subido no último commit):**
   ```bash
   npm install @aws-sdk/client-s3
   ```
5. **Configurar as Variáveis:** Crie o arquivo `.env.local` na raiz e preencha com as credenciais acima.
6. **Rodar o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   *Abra `http://localhost:3000` no seu navegador.*

7. **Testar Compilação de Produção:**
   ```bash
   npm run build
   ```
