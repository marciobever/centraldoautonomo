export interface Service {
  id: string;
  name: string;
  price: number;
  unit: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
  imageUrls?: string[];
  imageColor?: string; // fallback color for visual block representation
  status: "ativo" | "esgotado";
  createdAt: string;
  condition?: "novo" | "semi_novo" | "usado_excelente" | "usado_bom" | "usado_marcas";
  category?: "ferramentas" | "materiais" | "decoracao" | "eletronicos" | "outros";
  location?: string;
}

export interface Professional {
  id: string;
  username: string;
  name: string;
  title: string;
  category: string;
  city: string;
  rating: number;
  reviewsCount: number;
  avatarColor: string; // CSS gradient for abstract profile avatar
  bio: string;
  whatsapp: string;
  gallery: { title: string; color?: string; imageUrl?: string }[]; // Mock visual gallery using styled blocks
  services: Service[];
  products?: Product[];
  logoUrl?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'celular' | 'email' | 'chave_aleatoria' | '';
  pixKey?: string;
  cardDesign?: {
    bg: string;
    textColor: string;
    accentColor: string;
    patternType?: 'mesh' | 'glass' | 'geometric' | 'minimalist';
    badgeBg?: string;
  };
  stripeAccountId?: string;
  stripeConnectionStatus?: 'pending' | 'completed';
}

export interface Expense {
  id: string;
  description: string;
  category: "material" | "transporte" | "ferramentas" | "alimentacao" | "outros";
  value: number;
  date: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  status: 'pendente' | 'orçado' | 'fechado' | 'cancelado';
  createdAt: string;
  notes: string;
}

export interface Appointment {
  id: string;
  title: string;
  clientName: string;
  date: string; // AAAA-MM-DD
  time?: string; // HH:MM
  notes?: string;
  status: "agendado" | "concluido" | "cancelado";
  createdAt: string;
}

export const mockProfessionals: Professional[] = [
  {
    id: "prof_1",
    username: "pedro-pintor",
    name: "Pedro Alencar",
    title: "Pintor e Especialista em Texturas",
    category: "Pintor",
    city: "São Paulo - SP",
    rating: 4.9,
    reviewsCount: 38,
    avatarColor: "linear-gradient(135deg, oklch(65% 0.2 295), oklch(75% 0.17 195))",
    bio: "Especialista em pintura fina residencial e comercial, aplicação de massa corrida, texturas rústicas, cimento queimado e instalação de papel de parede. 12 anos de experiência com foco em limpeza, prazo e acabamento de alto padrão.",
    whatsapp: "5511999998888",
    gallery: [
      { title: "Paredes de Cimento Queimado - Sala", color: "oklch(45% 0.01 260)" },
      { title: "Pintura Externa - Fachada Residencial", color: "oklch(60% 0.08 150)" },
      { title: "Textura Projetada - Corredor Gourmet", color: "oklch(55% 0.12 40)" },
      { title: "Pintura Fina Sem Cheiro - Quarto Infantil", color: "oklch(78% 0.1 200)" }
    ],
    services: [
      { id: "s1", name: "Pintura Simples (por m²)", price: 25, unit: "m²", description: "Preparação de parede, selador e duas demãos de tinta látex premium." },
      { id: "s2", name: "Aplicação de Cimento Queimado (por m²)", price: 85, unit: "m²", description: "Efeito marmorato rústico ou cimento queimado moderno com acabamento selado resinado." },
      { id: "s3", name: "Aplicação de Massa Corrida (por m²)", price: 20, unit: "m²", description: "Lixamento completo e nivelamento de superfície para parede perfeitamente lisa." },
      { id: "s4", name: "Instalação de Papel de Parede (por rolo)", price: 90, unit: "rolo", description: "Aplicação limpa de papel de parede nacional ou importado com cola especial incluída." }
    ]
  },
  {
    id: "prof_2",
    username: "mariana-estetica",
    name: "Mariana Costa",
    title: "Manicure, Pedicure e Nail Designer",
    category: "Manicure/Estética",
    city: "Rio de Janeiro - RJ",
    rating: 4.8,
    reviewsCount: 52,
    avatarColor: "linear-gradient(135deg, oklch(72% 0.16 350), oklch(65% 0.2 295))",
    bio: "Profissional de nail design com especialização em alongamento em gel, fibra de vidro, esmaltação em gel e manicure russa. Atendimento exclusivo com materiais 100% esterilizados em autoclave e produtos de primeira linha.",
    whatsapp: "5521988887777",
    gallery: [
      { title: "Alongamento em Fibra de Vidro - Natural", color: "oklch(80% 0.05 20)" },
      { title: "Nail Art Minimalista - Encapsulada", color: "oklch(75% 0.08 340)" },
      { title: "Esmaltação em Gel - Vermelho Rubi", color: "oklch(45% 0.18 25)" },
      { title: "Blindagem de Unhas Naturais", color: "oklch(85% 0.03 80)" }
    ],
    services: [
      { id: "s5", name: "Manicure & Pedicure Tradicional", price: 65, unit: "sessão", description: "Cutilagem, hidratação, lixamento e esmaltação clássica nacional." },
      { id: "s6", name: "Alongamento de Fibra de Vidro", price: 180, unit: "aplicação", description: "Extensão de alta resistência e aspecto super natural com gel autonivelante." },
      { id: "s7", name: "Manutenção do Alongamento", price: 110, unit: "sessão", description: "Preenchimento do crescimento, ajuste do formato, cutilagem e nova esmaltação." },
      { id: "s8", name: "Esmaltação em Gel Duradoura", price: 80, unit: "sessão", description: "Secagem na cabine LED, brilho espelhado que dura até 21 dias sem lascar." }
    ]
  },
  {
    id: "prof_3",
    username: "lucas-eletrica",
    name: "Lucas Fernandes",
    title: "Eletricista Residencial e Industrial",
    category: "Eletricista",
    city: "Belo Horizonte - MG",
    rating: 5.0,
    reviewsCount: 29,
    avatarColor: "linear-gradient(135deg, oklch(75% 0.17 195), oklch(76% 0.17 142))",
    bio: "Eletricista credenciado pelo SENAI com ampla experiência em instalações elétricas, montagem de painéis, instalação de luminárias, tomadas, disjuntores e sistemas de aterramento. Atendimento rápido e laudo técnico NR-10.",
    whatsapp: "5531977776666",
    gallery: [
      { title: "Montagem de Quadro de Distribuição - QDC", color: "oklch(25% 0.01 260)" },
      { title: "Instalação de Fitas LED em Sanca", color: "oklch(85% 0.18 190)" },
      { title: "Troca Completa de Fiação Antiga", color: "oklch(50% 0.16 35)" },
      { title: "Infraestrutura de Tomadas Industriais", color: "oklch(35% 0.02 260)" }
    ],
    services: [
      { id: "s9", name: "Visita Técnica para Diagnóstico", price: 80, unit: "visita", description: "Avaliação do problema elétrico e elaboração de orçamento. Valor abatido caso o serviço seja fechado." },
      { id: "s10", name: "Troca de Chuveiro / Resistência", price: 70, unit: "instalação", description: "Instalação segura do aparelho, teste de vazamento e verificação da fiação/disjuntor." },
      { id: "s11", name: "Instalação de Lustres e Luminárias", price: 60, unit: "ponto", description: "Montagem e fixação de pendentes, plafons, lustres pesados ou trilhos eletrificados." },
      { id: "s12", name: "Montagem de Padrão CEMIG / Entrada", price: 450, unit: "serviço", description: "Montagem completa de caixa padrão monofásico ou trifásico conforme normas da concessionária." }
    ]
  },
  {
    id: "prof_4",
    username: "clara-confeitaria",
    name: "Ana Clara Souza",
    title: "Bolo Artístico e Doces Finos",
    category: "Confeitaria/Buffet",
    city: "Curitiba - PR",
    rating: 4.9,
    reviewsCount: 45,
    avatarColor: "linear-gradient(135deg, oklch(80% 0.14 78), oklch(72% 0.16 350))",
    bio: "Confeitaria artesanal de bolos personalizados para aniversários, casamentos e eventos corporativos. Trabalhamos com ingredientes nobres, chocolates belgas e recheios autorais. Doces finos que encantam os olhos e o paladar.",
    whatsapp: "5541966665555",
    gallery: [
      { title: "Bolo de Casamento Esculpido de 3 Andares", color: "oklch(95% 0.02 90)" },
      { title: "Cento de Brigadeiros Gourmet Sortidos", color: "oklch(30% 0.08 30)" },
      { title: "Bolo Infantil Decorado com Pasta Americana", color: "oklch(80% 0.12 180)" },
      { title: "Macarons Clássicos Franceses", color: "oklch(85% 0.09 330)" }
    ],
    services: [
      { id: "s13", name: "Bolo Decorado Personalizado (por kg)", price: 95, unit: "kg", description: "Bolo com cobertura em Chantininho ou Ganache e decoração personalizada de acordo com o tema." },
      { id: "s14", name: "Cento de Doces Clássicos (100 unid)", price: 130, unit: "cento", description: "Brigadeiro tradicional, beijinho de coco, bicho de pé e cajuzinho." },
      { id: "s15", name: "Cento de Doces Finos (100 unid)", price: 220, unit: "cento", description: "Copinhos de chocolate trufados, camafeus de nozes, brigadeiros gourmet de pistache e physalis." },
      { id: "s16", name: "Kit Festa Prático (Bolo + 100 Doces)", price: 350, unit: "kit", description: "Bolo decorado de 2kg + 100 doces tradicionais sortidos para comemoração rápida." }
    ]
  },
  {
    id: "prof_5",
    username: "marcos-ingles",
    name: "Prof. Marcos Silva",
    title: "Aulas Particulares de Inglês e Preparatórios",
    category: "Professor Particular",
    city: "Porto Alegre - RS",
    rating: 5.0,
    reviewsCount: 21,
    avatarColor: "linear-gradient(135deg, oklch(70% 0.17 195), oklch(65% 0.21 295))",
    bio: "Professor de inglês certificado pela Universidade de Cambridge (CELTA). Aulas focadas em conversação prática para negócios, viagens ou preparação para testes de proficiência (IELTS/TOEFL). Material digital personalizado incluso.",
    whatsapp: "5551955554444",
    gallery: [
      { title: "Aulas Online Via Zoom com Lousa Interativa", color: "oklch(35% 0.08 240)" },
      { title: "Material Didático Exclusivo em PDF", color: "oklch(70% 0.15 120)" },
      { title: "Dinâmicas de Conversação em Grupo", color: "oklch(60% 0.15 280)" },
      { title: "Simulado de Prova de Proficiência IELTS", color: "oklch(20% 0.01 260)" }
    ],
    services: [
      { id: "s17", name: "Aula Particular Avulsa (60 min)", price: 80, unit: "hora", description: "Aula de conversação ou gramática customizada de acordo com a necessidade imediata do aluno." },
      { id: "s18", name: "Pacote Mensal Prata (4 aulas/mês)", price: 280, unit: "mês", description: "Aulas individuais de 1 hora por semana + suporte por WhatsApp para tirar dúvidas diariamente." },
      { id: "s19", name: "Pacote Mensal Ouro (8 aulas/mês)", price: 500, unit: "mês", description: "Aulas individuais de 1 hora duas vezes por semana, com foco acelerado em fluência e negócios." },
      { id: "s20", name: "Curso de Inglês para Viagens (12 aulas)", price: 850, unit: "pacote", description: "Curso intensivo cobrindo situações comuns de viagem: aeroporto, hotel, restaurante e compras." }
    ]
  }
];

export const mockLeads: Lead[] = [
  {
    id: "lead_1",
    clientName: "Carla Albuquerque",
    clientPhone: "11988889999",
    serviceName: "Pintura Simples (por m²)",
    status: "pendente",
    createdAt: "2026-06-18T14:30:00Z",
    notes: "Preciso pintar uma sala comercial de aproximadamente 45m² na região da Av. Paulista."
  },
  {
    id: "lead_2",
    clientName: "Roberto Santos",
    clientPhone: "11977778888",
    serviceName: "Aplicação de Cimento Queimado (por m²)",
    status: "orçado",
    createdAt: "2026-06-17T10:15:00Z",
    notes: "Quero fazer cimento queimado na parede principal do meu quarto de casal. Cerca de 12m²."
  },
  {
    id: "lead_3",
    clientName: "Amanda Pires",
    clientPhone: "11966667777",
    serviceName: "Instalação de Papel de Parede (por rolo)",
    status: "fechado",
    createdAt: "2026-06-15T16:40:00Z",
    notes: "Instalar 3 rolos de papel de parede no hall de entrada. Trabalho concluído com sucesso."
  }
];

// Helper functions to simulate database query operations in frontend mockup
export function getProfessionalByUsername(username: string): Professional | undefined {
  return mockProfessionals.find(p => p.username === username);
}

export function getProfessionalsByCategory(category: string): Professional[] {
  if (!category || category === "Todos") return mockProfessionals;
  return mockProfessionals.filter(p => p.category === category);
}

export function searchProfessionals(query: string): Professional[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return mockProfessionals;
  return mockProfessionals.filter(p => 
    p.name.toLowerCase().includes(cleanQuery) ||
    p.title.toLowerCase().includes(cleanQuery) ||
    p.category.toLowerCase().includes(cleanQuery) ||
    p.city.toLowerCase().includes(cleanQuery)
  );
}
