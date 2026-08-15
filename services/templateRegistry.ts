export interface ProfessionalTemplate {
  id: string;
  title: string;
  category: string;
  icon: string;
  tagline: string;
  description: string;
  badges: string[];
  specs: string;
  colorScheme: string;
  bgGradient: string;
  recommendedFor: string;
  detectedMcpCapabilities?: string[];
  sampleComponents?: string[];
}

export const PROFESSIONAL_TEMPLATES: ProfessionalTemplate[] = [
  {
    id: 'saas_ai_platform',
    title: 'SaaS AI Platform & Dashboard',
    category: 'SaaS & AI Technology',
    icon: '🚀',
    tagline: 'Layout de alta conversão para produtos de Inteligência Artificial e SaaS B2B.',
    description: 'Hero section com badge animada e CTA duplo, Bento Grid 3x3 assimétrico com cards glassmorphism, tabela de preços com toggle mensal/anual e FAQ accordion.',
    badges: ['Notion MCP Ready', 'Bento Grid 3x3', 'Interactive Pricing', 'FAQ Accordion'],
    specs: 'Header sticky com logo e CTA, Hero com badge pulsante e headline em gradiente, Bento Grid com 6 cards de recursos, Tabela de Preços com 3 planos e toggle de período, FAQ sanfonado e Footer com newsletter.',
    colorScheme: 'Dark Luxury Gold & Obsidian',
    bgGradient: 'from-purple-900/40 via-slate-900 to-indigo-950/60',
    recommendedFor: 'Plataformas SaaS, Agentes de IA, Micro-SaaS e Ferramentas Developer',
    detectedMcpCapabilities: ['Figma Design Tokens', 'Notion Callouts & FAQ', 'Design & Motion MCP', 'DOM Inspector'],
    sampleComponents: ['Hero Animated Badge', 'Bento Grid 3x3', 'Pricing Toggle Switch', 'FAQ Accordion', 'Interactive CTA']
  },
  {
    id: 'agency_enterprise',
    title: 'Agência Digital & Soluções Enterprise',
    category: 'Services & B2B Consulting',
    icon: '🏢',
    tagline: 'Design executivo com matriz de marcas, casos de sucesso e formulário de proposta.',
    description: 'Hero de alto impacto, matriz de logos de clientes com efeito marquee, linha do tempo de metodologia em 4 passos, depoimentos em grid e callout para agendamento de reuniões.',
    badges: ['Notion MCP Ready', 'Client Logos Grid', 'Timeline Steps', 'Contact Callout'],
    specs: 'Header com navegação limpa, Hero executivo com métricas em números grandes, Grid de clientes, Timeline de 4 etapas de execução, Seção de depoimentos com estrelas e Callout de contato com formulário.',
    colorScheme: 'SaaS Slate & Indigo Enterprise',
    bgGradient: 'from-blue-900/40 via-slate-900 to-slate-950',
    recommendedFor: 'Agências de Marketing, Consultorias B2B, Software Houses e Estúdios Design',
    detectedMcpCapabilities: ['Notion Directives', 'Figma Typography Hierarchy', 'Design MCP Marquee', 'FileSystem HTML5'],
    sampleComponents: ['Executive Hero Banner', 'Client Logo Marquee', '4-Step Process Timeline', 'Testimonials Grid', 'Lead Capture Callout']
  },
  {
    id: 'fintech_b2b',
    title: 'Fintech & B2B Financial Analytics',
    category: 'Finance & Data Analytics',
    icon: '📊',
    tagline: 'Segurança e credibilidade com contadores KPI, tabelas comparativas e selos de conformidade.',
    description: 'Hero com métricas financeiras ao vivo, tabela comparativa com concorrentes, cards de recursos de segurança e criptografia, e formulário de demonstrativo comercial.',
    badges: ['Notion MCP Ready', 'Comparison Table', 'KPI Live Counters', 'Compliance Badges'],
    specs: 'Header executivo, Hero com contador de métricas e CTA de demonstração, Tabela de Comparação lado a lado, Seção de Recursos de Segurança com ícones e Callout de captura de lead.',
    colorScheme: 'Emerald & Dark Slate Luxury',
    bgGradient: 'from-emerald-950/40 via-slate-900 to-teal-950/60',
    recommendedFor: 'Fintechs, Gateway de Pagamentos, Plataformas de Investimento e Analytics',
    detectedMcpCapabilities: ['Figma Color Palette', 'Notion Comparison Database', 'Browser DOM Inspector', 'WCAG AA Contrast'],
    sampleComponents: ['Live KPI Counters', 'Competitor Comparison Table', 'Security Compliance Grid', 'Interactive ROI Calculator']
  },
  {
    id: 'ecommerce_storefront',
    title: 'E-Commerce & Digital Products Storefront',
    category: 'E-Commerce & Digital Goods',
    icon: '🛍️',
    tagline: 'Vitrine de produtos digitais ou físicos orientada a decisões de compra rápidas.',
    description: 'Hero focado no produto principal, galeria interativa de lançamentos, avaliações com selo de verificação de clientes, badge de desconto relâmpago e rodapé sticky de checkout.',
    badges: ['Notion MCP Ready', 'Product Showcase', 'Ratings Badge', 'Sticky Checkout'],
    specs: 'Header com carrinho e busca, Hero com imagem em destaque do produto, Grid de produtos com preços e selos, Seção de avaliações de clientes verificados e Footer de checkout direto.',
    colorScheme: 'Cyberpunk Rose & Amber Glow',
    bgGradient: 'from-rose-950/40 via-slate-900 to-amber-950/40',
    recommendedFor: 'Cursos Digitais, E-books, Infoprodutos, Licenças de Software e E-Commerce',
    detectedMcpCapabilities: ['Notion Product Catalog', 'Figma Product Cards', 'Design Motion Hover', 'FileSystem Exporter'],
    sampleComponents: ['Product Hero Spotlight', 'Category Filter Grid', 'Verified Customer Ratings', 'Flash Sale Countdown', 'Sticky Cart Bar']
  },
  {
    id: 'portfolio_creative',
    title: 'Portfólio Criativo & High-End Studio',
    category: 'Personal Branding & Creative',
    icon: '💼',
    tagline: 'Estética minimalista sofisticada para profissionais, designers e criadores de conteúdo.',
    description: 'Hero minimalista com foto de perfil ou marca d’água, galeria de projetos em estilo cartão suspenso, histórico de experiências/clientes e caixa de contato minimalista.',
    badges: ['Notion MCP Ready', 'Minimalist Layout', 'Project Showcase', 'Smooth Hover'],
    specs: 'Header minimalista sem poluição, Hero limpo com introdução pessoal/estúdio, Grid de projetos com zoom no hover, Seção de premiações/clientes e Formulário minimalista de contato.',
    colorScheme: 'Minimalist Charcoal & Warm Cream',
    bgGradient: 'from-zinc-900 via-slate-900 to-stone-950',
    recommendedFor: 'Designers UI/UX, Desenvolvedores Freelancer, Fotógrafos e Criadores de Conteúdo',
    detectedMcpCapabilities: ['Figma Component Frames', 'Notion Experience Timeline', 'Design MCP Smooth Motion', 'Browser Viewport'],
    sampleComponents: ['Minimalist Editorial Hero', 'Floating Project Showcase Cards', 'Experience Timeline', 'Interactive Contact Card']
  },
  {
    id: 'automation_workflow_hub',
    title: 'AI Automation & Workflow Hub',
    category: 'Developer & Workflow Automation',
    icon: '🤖',
    tagline: 'Hub interativo para arquitetura de fluxos de IA, nós de automação e conectores Notion.',
    description: 'Hero com diagrama de fluxo interativo em nós, cartões com status de conectores MCP (Notion, Figma, Gemini), simulador de logs de execução ao vivo e links de documentação.',
    badges: ['Notion MCP Ready', 'Pipeline Diagram', 'Live Status Badge', 'Node Specs'],
    specs: 'Header técnico com indicadores de API, Hero com simulação de fluxo em nós conectáveis, Cards de conectores MCP com badges de status, Terminal de logs ao vivo e Documentação integrada.',
    colorScheme: 'Deep Cyberpunk Purple & Neon Cyan',
    bgGradient: 'from-purple-950/50 via-slate-900 to-cyan-950/50',
    recommendedFor: 'Arquitetos de Automação n8n, Engenheiros de Prompt, Desenvolvedores API',
    detectedMcpCapabilities: ['All 5 MCP Servers Co-Pilot', 'Notion PRD Integration', 'Figma Graph Nodes', 'FileSystem Code Patching'],
    sampleComponents: ['Interactive Pipeline Visualizer', 'MCP Connector Status Cards', 'Real-Time Console Terminal', 'API Endpoint Matrix']
  },
  {
    id: 'auto_presentation_deck',
    title: 'Apresentação Automática & Pitch Deck Sem Scroll',
    category: 'Presentation & Pitch Decks',
    icon: '🎬',
    tagline: 'Página em formato slide cinematográfico com transição automática por timer e sem necessidade de scroll.',
    description: 'Apresentação de produto e negócio em tela cheia com carrossel/slide automático, barra de progresso em tempo real, controles de pausa/avanço e transições fluidas.',
    badges: ['Notion MCP Ready', 'Auto-Slide Timer', 'Zero-Scroll Presentation', 'Keyboard Controls'],
    specs: 'Header com progresso de slides, Container de slide full-screen dinâmico, Barra de progresso cronometrada com autoplay, Indicadores de slides e botões de navegação rápida.',
    colorScheme: 'Obsidian Black & Electric Indigo',
    bgGradient: 'from-indigo-950/60 via-slate-950 to-purple-950/60',
    recommendedFor: 'Apresentações de Pitch Deck, Lançamento de Produtos, Telas Comerciais e Demonstrações',
    detectedMcpCapabilities: ['Design & Motion Keyframes', 'Notion Product Bullet Points', 'Browser Key Events JS', 'Figma Color Scheme'],
    sampleComponents: ['Fullscreen Slide Carousel', 'Live Progress Timeline Bar', 'Auto-Play / Pause Controls', 'Key Metrics Highlights']
  },
  {
    id: 'mobile_app_landing',
    title: 'Mobile App Showcase & App Store Showcase',
    category: 'Mobile & Consumer Apps',
    icon: '📱',
    tagline: 'Design imersivo focado em download de app, mockup interativo de celular e reviews.',
    description: 'Hero com mockup realista de smartphone, botões para App Store e Google Play, carrossel de capturas de tela do app e seção de perguntas frequentes.',
    badges: ['Notion MCP Ready', 'Device Mockup', 'App Store Badges', 'Feature Tabs'],
    specs: 'Hero com mockup 3D de celular em CSS, botões de download nas lojas, abas de recursos interativas, carrossel de screenshots do app e depoimentos.',
    colorScheme: 'iOS Dark Indigo & Cyber Cyan',
    bgGradient: 'from-blue-950/50 via-slate-900 to-indigo-950/50',
    recommendedFor: 'Aplicativos iOS / Android, Fintechs Mobile e Ferramentas B2C',
    detectedMcpCapabilities: ['Figma Device Frames', 'Notion Release Notes', 'Design & Motion CSS Mockup', 'DOM Inspector'],
    sampleComponents: ['CSS Phone Frame Mockup', 'Store Download Badges', 'Interactive Feature Tabs', 'App Screens Carousel']
  }
];
