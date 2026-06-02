# BidWise (Prop-Maestro) — Manual Completo do Sistema

Bem-vindo ao **BidWise (Prop-Maestro)**, a plataforma definitiva de inteligência e gestão para ativos imobiliários provenientes de leilões (judiciais e extrajudiciais) ou compras diretas no mercado. Este documento fornece uma visão panorâmica e detalhada de todas as funcionalidades, regras de negócios financeiras, decisões de arquitetura e otimizações de experiência de usuário (UX) do ecossistema.

---

## 🧭 1. Visão Geral do Sistema

O **BidWise** centraliza o ciclo completo de investimentos imobiliários, desde a fase de prospecção/análise de risco até o desinvestimento (venda ou locação). A plataforma resolve de forma analítica e visual os desafios de investidores de leilão, integrando:
1. **Controle Físico-Legal**: Rastreamento da situação documental, desocupação e regularização cartorária.
2. **Engenharia Financeira Avançada**: Apuração precisa de Fluxo de Caixa, Capital Alocado (Cash-out real), Lucro Líquido Real e Retorno sobre Capital (ROI / Cash-on-Cash Return).
3. **Análise de Risco com IA**: Relatórios automáticos e sumários de viabilidade jurídica criados com o modelo **Gemini 3.5 Flash** de forma segura no servidor.
4. **Gestão Documental**: Centralização de comprovantes de despesas, escrituras, cartas de arrematação e guias tributárias.

---

## 📊 2. Funcionalidades do Dashboard Principal

O **Dashboard** é o centro nervoso de tomada de decisão. Ele agrega dados consolidados em tempo real de toda a carteira ativa, ocultando transações associadas a imóveis deletados ou inexistentes (evitando "dados órfãos").

### 2.1. Métricas Globais (Cards Superiores)
* **Total Investido (Capital Alocado)**: Soma de todas as parcelas reais pagas de entrada, custos de aquisição extra (registro, ITBI, leiloeiro), reformas e custos mensais acumulados de holding.
* **Margem de Lucro Estimada (Líquida)**: Lucro líquido consolidado após descontar impostos (alíquota padrão de 15% sobre ganho de capital permanente), taxas de corretagem e custos operacionais de holding de todos os ativos.
* **Retorno sobre Capital Médio (ROI)**: Proporção ponderada de ganho (ROI Cash-on-Cash) sobre o dinheiro que efetivamente saiu do caixa do investidor.
* **Total de Ativos**: Contagem precisa de imóveis ativos cadastrados na carteira sob as categorias (Análise, Arrematado, Vendido, Alugado, etc.).

### 2.2. Bento Grid do Ativo Principal
Destaque dinâmico e inteligente do maior ativo em carteira, realçando de forma elegante o endereço, percentual de progresso financeiro e links Rápidos para a ficha técnica dedicada do imóvel.

### 2.3. Distribuição Visual de Carteira (Gráficos Interativos)
* **Fluxo de Caixa Mensal**: Gráficos de linhas e áreas (`recharts`) ilustrando aportes versus faturamento ao longo do tempo.
* **Componentes de Custo**: Gráfico de rosca/pizza categorizando de forma percentual onde o capital próprio está alocado (Arrematação vs Reformas vs Custos Extraordinários vs Despesas de Holding).

### 2.4. Proteção contra "Layout Shift" (Skeletons de Carregamento)
Implementação de **Skeletons de Carregamento** que simulam a estrutura geométrica exata do Dashboard (Cards de estatísticas, gráficos e bento items) enquanto o Firebase Firestore sincroniza os dados, proporcionando uma transição visual ultra suave.

---

## 🏢 3. Diretório e Gerenciamento de Imóveis (`/properties`)

A área de **Imóveis** funciona como um CRM e banco de dados de ativos imobiliários, permitindo adicionar, atualizar, remover e filtrar imóveis de forma ágil.

### 3.1. Filtros Multicamadas e Busca Avançada
A plataforma oferece filtros sofisticados para refinar instantaneamente as listagens por:
* **Busca Textual**: Procura por trechos do endereço, bairro ou comarca.
* **Origem do Imóvel**: `"Leilão judicial"`, `"Leilão extrajudicial"`, `"Venda online"`, `"Compra direta"` ou `"Mercado"`.
* **Tipo do Imóvel**: `"Apartamento"`, `"Casa"`, `"Terreno"`, `"Sala Comercial"`, `"Galpão"` ou `"Outro"`.
* **Situação Jurídica**: `"Alienação Fiduciária"`, `"Inventário"`, `"Execução Fiscal"`, `"Penhora"`, `"Outro"`.
* **Estado de Conservação**: Mapeia desde ativos em estado `"Ótimo"` até estruturas a serem `"Demolidas"`.
* **Status de Arrematação**: `"Análise"`, `"Arrematado"`, `"Vendido"`, `"Alugado"`, `"Perdido"`, `"Cancelado"`, `"Reprovado"`.
* **Tipo de Transação**: Filtro para planos de pagamento base (Compras `"À Vista"` versus `"Financiadas"`).

### 3.2. Form de Cadastro e Edição Amigável
Controle de validação rigoroso com campos condicionais baseados no tipo de transação (por exemplo, mostrando o campo de **Saldo Devedor** apenas quando marcado como compra de tipo "Financiada" e campos de leiloeiro ou número do processo somente quando a origem do ativo é "Leilão").

---

## 🔍 4. Detalhes do Imóvel (`/properties/:id`)

Cada imóvel possui uma página de detalhamento dedicada que opera em um layout modular dividido em abas estilizadas de forma responsiva.

### 4.1. Aba: Análise (Dossiê de Viabilidade & IA)
* **Informações Jurídicas e Técnicas**: Traz o escopo processual, comarca governante, número da ação e links rápidos dos editais de leilão.
* **Dossiê com Gemini IA**: Um botão inteligente permite acionar o modelo de linguagem do **Gemini 3.5**. A inteligência analisa detalhes do imóvel (situação jurídica, pendências, valores) e gera um relatório Markdown estruturado de riscos, pontos de atenção crítica, histórico forense presumido e recomendações estratégicas. O resultado é salvo e persistido diretamente no Firestore.

### 4.2. Aba: Custos de Aquisição (Pós-Arrematação)
Gerenciamento de impostos, emolumentos de cartório e serviços jurídicos imediatos necessários para registrar e escriturar o bem.
* **Lançamentos**: Permite discriminar tipo do custo (ITBI, Registro RGI, Desocupação, Comissão de Leiloeiro, Outros), valor, data de vencimento e status do pagamento (`Pago`, `Pendente`, `Vencido`).
* **Anexos de Comprovantes**: Upload de arquivos e comprovantes fiscais vinculados às despesas.

### 4.3. Aba: Reformas e Benfeitorias
Calculadora física para acompanhamento de intervenções de engenharia destinadas a valorizar o imóvel.
* **Orçamento vs. Valor Real**: Permite projetar um teto de despesas (Orçamento) e contrastar com as faturas reais pagas (Valor Real). O sistema usa de forma inteligente o Valor Real para cálculos financeiros de lucro líquido e, caso indisponível, recorre ao valor orçado para manter estimativas conservadoras.
* **Cronograma**: Informação de prazo estimado e data de conclusão efetiva.

### 4.4. Aba: Holding (Custo de Carregamento Mensal)
Despesas fixas recorrentes enquanto o imóvel permanece em carteira (períodos de desocupação).
* **Itens Incorporados**: Condomínio, IPTU, contas de serviços básicos (energia, água, internet) ou vigilância patrimonial.
* **Competência**: Permite rastrear mês a mês os gastos incorridos (exemplo: `"05/2026"`).

### 4.5. Aba: Faturamento e Desinvestimento
Acompanhamento dos frutos do capital alocado.
* **Locação ou Venda**: Lançamento das operações onde o investidor de fato concretiza a liquidez do ativo.
* **Desconto de Corretagem**: Registro da comissão de corretores e imobiliárias, que abate sobre o faturamento bruto para formar a receita líquida do negócio de forma automática.

### 4.6. Aba: Cofre de Documentos
Módulo focado no status e armazenamento de arquivos fundamentais, tais como: Carta de Arrematação, Matrícula de Imóvel, Escritura, etc. Cada documento possui um status de fluxo (`Pendente`, `Recebido`, `Protocolado`, `Registrado`) facilitando a auditoria jurídica do ativo.

---

## 🧮 5. Engenharia Financeira: Fórmulas e Regras de Negócio

As fórmulas financeiras são calculadas deterministicamente pelo sistema na camada cliente/servidor para assegurar perfeita fidelidade de fluxo de caixa operacional:

### 5.1. Capital Alocado Total (Cash-on-Cash Capital)
Mede o dinheiro real desembolsado pelo investidor:
1. **Entrada Efetiva ($Ent_{ef}$)**:
   * Se compra **Financiada**: Roda um algoritmo preventivo de valores negativos:
     $$Ent_{ef} = \max(0, \text{Valor Arrematacao} - \text{Saldo Devedor})$$
   * Se compra **À Vista**:
     $$Ent_{ef} = \text{Valor Arrematacao}$$
2. **Capital Alocado**:
   $$Capital = Ent_{ef} + \sum(Custos Aquisição) + \sum(Reformas Efetivadas) + \sum(Despesas Holding)$$

### 5.2. Imposto de Renda (Ganho de Capital)
Regulado conforme estipulações de editais fiscais de leilões:
1. **Deduções Legais de Capital ($Custos_{Dedutiveis}$)**:
   Soma do valor de aquisição integral (Arrematação + Custos Acessórios) e benfeitorias físicas definitivas (Reformas):
   $$Custos_{Dedutiveis} = \text{Valor Arrematacao} + \sum(Custos Aquisição) + \sum(Reformas)$$
2. **Determinação da Receita Base**:
   Se houver **Venda/Locação** efetiva com receita líquida ($F_{liq} > 0$), a receita é o faturamento já consolidado. Se o ativo ainda não foi vendido, projeta-se o ganho tendo como base o **Valor de Avaliação** do imóvel para análise prévia de viabilidade de margem.
3. **Imposto de Renda (IR - 15%)**:
   $$IR = \max(0, (\text{Receita Base} - Custos_{Dedutiveis}) \times 0.15)$$

### 5.3. Lucro Líquido Final e ROI
O Lucro Líquido final apura os desdobramentos operacionais excluindo o imposto de renda e as taxas de carregamento (holding), as quais não entram nas deduções da Receita Federal:
$$Lucro_{liquido} = \text{Receita Base} - Custos_{Dedutiveis} - \sum(Holding) - IR$$

$$ROI\% = \left( \frac{Lucro_{liquido}}{Capital Alocado} \right) \times 100$$

---

## 📱 6. UX Responsiva e Otimizações Recentes

Para oferecer uma experiência de altíssimo nível em celulares, tablets e desktops de alta resolução, o sistema conta com refinamentos cruciais na interface (Tailwind CSS v4):

1. **Menu de Abas Inteligente no Mobile**: O menu de abas longitudinais na página dedetalhes do imóvel (`Análise`, `Custos`, `Reforma`, `Holding`, `Faturamento`, `Documentos`) foi aprimorado para rolar horizontalmente com suavidade utilizando as diretrizes de toque das plataformas iOS/Android (`snap-start`, `overflow-x-auto` e ocultação nativa visual de barras de rolagem estéticas). Isso evita quebras visuais e permite mudar de seções facilmente.
2. **Skins de Visualização e Layouts Adaptáveis**: Ajustes automáticos baseados nas dimensões de tela para grids (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), reduzindo lacunas e margens em telas verticais de modo a priorizar informações de dados sobre pixels de preenchimento.
3. **Resolução de Concorrência de React Hooks**: Correção e reestruturação estrita das ordens de chamadas de hooks de controle e estados (como `useState`, `useFirestore` e `useNavigate`) em componentes-chave. Todos os hooks rodam agora de forma determinística nas primeiras linhas de render dos módulos de visualização, eliminando erros de alteração de ordem entre renderizações subsequentes comuns do ecossistema React.
