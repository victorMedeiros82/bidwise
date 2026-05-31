# Documento de Especificação de Software - BidWise (Prop-Maestro)

Este documento descreve detalhadamente as especificações técnicas, regras de negócios e fluxos do sistema **BidWise (Prop-Maestro)**. Seu principal propósito é servir como roteiro preciso para a implementação, manutenção e **geração de testes automotivos (Unitários, Integração e E2E)** do ecossistema da aplicação.

---

## 1. Visão Geral do Sistema

O **BidWise** é um sistema completo de gestão de ativos imobiliários adquiridos por leilão (judicial e extrajudicial) ou mercado direto. A plataforma resolve as dores do investidor imobiliário ao centralizar em uma única ferramenta:
- Acompanhamento do status físico-jurídico-comercial de cada imóvel.
- Apuração precisa do **Fluxo de Caixa**, **Capital Alocado (Cash-out)**, **Lucro Líquido** e **Retorno sobre Capital Próprio (ROI / Cash-on-Cash Return)**.
- Geração automatizada de **Relatórios de Análise de Risco e Viabilidade** por meio da inteligência artificial **Gemini 3.5 Flash / Gemini 3 Flash**.
- Gestão documental (RGI, Escrituras, Comprovantes de Custos).

---

## 2. Arquitetura e Stack Tecnológico

- **Frontend:** React 18+ com Vite e TypeScript.
- **Estilização:** Tailwind CSS v4 para uma interface responsiva, com suporte a temas (Modo Escuro / Modo Claro).
- **Gerenciador de Estado e Sincronização:** React Hooks e Firebase Firestore para persistência em tempo real.
- **Autenticação:** Firebase Auth (controle por usuário; cada usuário visualiza e gerencia apenas seus próprios imóveis e despesas).
- **Serviço de IA:** `@google/genai` (SDK moderno da Google) operando do lado do servidor para ocultar chaves de API secretas.
- **Gráficos e Visualização:**
  - `recharts` para gráficos de Fluxo de Caixa Acumulado e Distribuição de Custos.
  - `lucide-react` para os ícones padrão da interface.
  - `motion/react` para animações fluidas de transição.

---

## 3. Modelo de Dados (Firestore Schemas)

Sempre que forem criados testes de integração ou regras de validação, as entidades devem respeitar os esquemas abaixo, mapeados no `firebase-blueprint.json` e `src/types.ts`.

### 3.1. Imóvel (`imovel` / Coleção: `imoveis`)
Representa o ativo imobiliário principal e reúne tanto as características físicas quanto os dados originais de leilão ou compra direta.

| Atributo | Tipo | Obrigatório | Descrição / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Não (Auto-ID) | Identificador exclusivo gerado pelo Firestore. |
| `codigo` | `string` | Não | Código interno identificador de controle. |
| `origem` | `enum` | Sim | `"Leilão extrajudicial"`, `"Leilão Judicial"`, `"Venda online"`, `"Compra direta"`, `"Mercado"`. |
| `matricula` | `string` | Sim | Número do Registro de Imóveis (RGI). |
| `endereco` | `string` | Sim | Endereço completo. |
| `cep` | `string` | Não | CEP do imóvel. |
| `bairro` | `string` | Não | Bairro do imóvel. |
| `cidade` | `string` | Não | Cidade. |
| `estado` | `string` | Não | Estado (UF). |
| `area_m2` | `number` | Sim | Área em metros quadrados (deve ser > 0). |
| `tipo_imovel` | `enum` | Sim | `"Apartamento"`, `"Casa"`, `"Terreno"`, `"Sala Comercial"`, `"Galpão"`, `"Outro"`. |
| `situacao_juridica`| `enum` | Sim | `"Alienação Fiduciária"`, `"Inventário"`, `"Execução Fiscal"`, `"Penhora"`, `"Outro"`. |
| `estado_conservacao`| `enum` | Sim | `"Ótimo"`, `"Bom"`, `"Regular"`, `"Ruim"`, `"Demolido"`. |
| `analise_risco` | `string` | Não | Relatório Markdown gerado pelo Gemini. |
| `status_arrematacao`| `enum` | Sim | `"Análise"`, `"Arrematado"`, `"Vendido"`, `"Alugado"`, `"Perdido"`, `"Cancelado"`, `"Reprovado"`. |
| `valor_arrematacao`| `number` | Não | Valor total acordado/lance final do leilão. |
| `tipo_arrematacao`| `enum` | Não | `"À Vista"`, `"Financiada"`. |
| `saldo_devedor` | `number` | Não | Saldo devedor/financiamento pendente comercial. |
| **Campos de Leilão** | | | *(Preenchidos caso a origem seja leilão)* |
| `processo` | `string` | Não | Número do processo judicial associado. |
| `comarca` | `string` | Não | Comarca / Vara de origem do leilão. |
| `tipo_leilao` | `enum` | Não | `"Judicial"`, `"Extrajudicial"`. |
| `data_leilao` | `string` | Não | Data da realização do leilão. |
| `link_edital` | `string` | Não | Link URL do edital homologado. |
| `valor_avaliacao` | `number` | Não | Valor oficial de avaliação do imóvel. |
| `valor_minimo` | `number` | Não | Lance mínimo inicial aceitável. |
| `forma_arrematacao`| `enum` | Não | `"Presencial"`, `"Online"`, `"Híbrido"`. |
| `condicoes_pagamento`| `string`| Não | Descrição textual das regras de parcelamento do edital. |
| **Metadados** | | | |
| `createdAt` | `Timestamp`| Sim | Data de criação (ServerTimestamp). |
| `updatedAt` | `Timestamp`| Sim | Data da última modificação (ServerTimestamp). |
| `createdBy` | `string` | Sim | UID do usuário autenticado criador do registro. |

---

### 3.2. Custo de Aquisição (`custo_aquisicao` / Coleção: `custos_aquisicao`)
Custos acessórios imediatos pós-martelo para regularização de posse e propriedade do ativo.

- `id_imovel` (Obrigatório): ID do imóvel relacionado.
- `tipo_custo` (Obrigatório / ex: `"ITBI"`, `"Registro RGI"`, `"Desocupação"`, `"Comissão Leiloeiro"`, `"Impostos Extras"`).
- `valor` (Obrigatório, `number`).
- `data_vencimento` (Não obrigatório, `string`).
- `status_pagamento` (Obrigatório, `enum`): `"Pago"`, `"Pendente"`, `"Vencido"`, `"Cancelado"`.
- `fileUrl` (Não obrigatório, `string`): Comprovante/Documento digital correspondente.

---

### 3.3. Custo de Reforma (`custo_reforma` / Coleção: `custos_reforma`)
Custos de melhorias e reformas destinados a agregar valor físico ao imóvel.

- `id_imovel` (Obrigatório): ID do imóvel relacionado.
- `descricao_etapa` (Obrigatório / ex: `"Pintura Geral"`, `"Reforma Elétrica"`, `"Instalação Hidráulica"`).
- `orcamento` (Obrigatório, `number`): Orçamento estimado inicial.
- `valor_real` (Não obrigatório, `number`): Valor final efetivamente desembolsado.
- `prazo_execucao` (Não obrigatório, `string`).
- `data_conclusao` (Não obrigatório, `string`).
- `fileUrl` (Não obrigatório, `string`): Nota fiscal / Comprovante fotográfico.

---

### 3.4. Holding / Despesa Mensal (`holding` / Coleção: `holding`)
Custos operacionais fixos mensais carregados pelo investidor enquanto o imóvel está sob sua propriedade (período de inércia).

- `id_imovel` (Obrigatório): ID do imóvel relacionado.
- `tipo_despesa` (Obrigatório / ex: `"Condomínio"`, `"IPTU"`, `"Energia Elétrica"`, `"Água"`, `"Segurança"`).
- `valor_mensal` (Obrigatório, `number`).
- `competencia` (Obrigatório, `string`): Mês/ano de referência (ex: `"05/2026"`).
- `fileUrl` (Não obrigatório, `string`).

---

### 3.5. Faturamento (`faturamento` / Coleção: `faturamento`)
Operações financeiras de desinvestimento ou monetização do imóvel.

- `id_imovel` (Obrigatório): ID do imóvel relacionado.
- `tipo` (Obrigatório, `enum`): `"Venda"`, `"Locação"`.
- `valor` (Obrigatório, `number`).
- `data_operacao` (Não obrigatório, `string`).
- `custo_corretagem` (Não obrigatório, `number`): Comissão paga à imobiliária/corretor.
- `fileUrl` (Não obrigatório, `string`).

---

### 3.6. Documentos (`documento` / Coleção: `documentos`)
Acompanhamento cartorário e de documentação formalizadora.

- `id_imovel` (Obrigatório): ID do imóvel relacionado.
- `tipo_doc` (Obrigatório / ex: `"Carta de Arrematação"`, `"Escritura Pública"`, `"Guia de ITBI"`, `"Matrícula Atualizada"`).
- `status` (Obrigatório, `enum`): `"Pendente"`, `"Recebido"`, `"Protocolado"`, `"Registrado"`, `"Cancelado"`.
- `data_recebimento` / `data_vencimento` (Não obrigatório, `string`).
- `responsavel` (Não obrigatório, `string`).
- `fileUrl` (Não obrigatório, `string`).

---

## 4. Regras de Negócio e Fórmulas Financeiras

As fórmulas matemáticas do sistema são determinísticas e devem ser replicadas integralmente em testes de regressão automatizados para evitar distorções no cálculo do ROI.

### 4.1. Consolidação Financeira de Variáveis Base

1. **Valor de Arrematação Base ($V_{arr}$):**
   $$V_{arr} = \text{imovel.valor\_arrematacao} \lor 0$$

2. **Total de Custos Extras de Aquisição ($C_{aq}$):**
   $$C_{aq} = \sum (\text{custo\_aquisicao.valor})$$

3. **Total de Gastos de Aquisição Geral ($T_{aq}$):**
   $$T_{aq} = V_{arr} + C_{aq}$$

4. **Total de Custos de Reforma ($T_{ref}$):**
   Utiliza o valor real desembolsado se disponível; caso contrário, utiliza o orçamento estipulado:
   $$T_{ref} = \sum (\text{custo\_reforma.valor\_real} \lor \text{custo\_reforma.orcamento} \lor 0)$$

5. **Total de Despesas Fixas Mensais/Holding ($T_{hold}$):**
   $$T_{hold} = \sum (\text{holding.valor\_mensal} \lor 0)$$

---

### 4.2. Fluxo de Faturamento (Receitas e Comissão)

1. **Faturamento Bruto ($F_{bruto}$):**
   Soma de todas as transações de receitas legítimas cadastradas para o ID do ativo.
   $$F_{bruto} = \sum (\text{faturamento.valor})$$

2. **Total de Comissões de Corretagem ($C_{corr}$):**
   $$C_{corr} = \sum (\text{faturamento.custo\_corretagem} \lor 0)$$

3. **Faturamento Líquido ($F_{liq}$):**
   $$F_{liq} = F_{bruto} - C_{corr}$$

---

### 4.3. Capital Alocado (Cash-out / Investimento Próprio Real)

O capital alocado representa o dinheiro efetivo desembolsado do bolso do investidor (capital próprio líquido). 

- Quando a arrematação/compra é **Financiada**, a entrada real inicial corresponde à diferença entre o valor total da arrematação e o saldo devedor/financiado. 
- Para evitar valores negativos absurdos em cenários onde os dados estejam incompletos ou em preenchimento inicial (ex: $V_{arr} < S_{dev}$), aplica-se a trava $Math.max(0, \dots)$:

1. **Entrada Efetiva ($Ent_{ef}$):**
   $$\text{Se } (\text{tipo\_arrematacao} = \text{"Financiada"}): \quad Ent_{ef} = \max(0, V_{arr} - S_{dev})$$
   $$\text{Se } (\text{tipo\_arrematacao} \neq \text{"Financiada"}): \quad Ent_{ef} = V_{arr}$$
   *(onde $S_{dev}$ é o `imovel.saldo_devedor`)*

2. **Capital Alocado Total ($Capital_{alocado}$):**
   $$Capital_{alocado} = Ent_{ef} + C_{aq} + T_{ref} + T_{hold}$$

---

### 4.4. Lucro e Imposto de Renda (IR)

O imposto de renda incide sobre o lucro econômico da operação (lucro bruto das transações decorrentes).

1. **Base de Cálculo de Receita ($Receita_{base}$):**
   Se o imóvel já possui dados de Faturamento Líquido registrados ($F_{liq} > 0$), este é utilizado como receita. Caso contrário (em análise ou holding), assume-se conservadoramente o valor de avaliação do ativo para apuração projetada de viabilidade:
   $$Receita_{base} = \text{Se } (F_{liq} > 0) \text{ então } F_{liq} \text{ senão } (\text{imovel.valor\_avaliacao} \lor 0)$$

2. **Custos Base para Dedução ($Custos_{Dedu}$):**
   Compreende todas as despesas capitais permanentes investidas no ativo (Valor total de aquisição inicial + benfeitorias da reforma):
   $$Custos_{Dedu} = T_{aq} + T_{ref}$$

3. **Lucro Bruto para Computação Fiscal ($Lucros_{brut}$):**
   $$Lucros_{brut} = Receita_{base} - Custos_{Dedu}$$

4. **Imposto de Renda ($IR$):**
   A alíquota padrão estabelecida em edital é de 15% incidente exclusivamente quando houver incremento positivo de ganho de capital:
   $$IR = \text{Se } (Lucros_{brut} > 0) \text{ então } (Lucros_{brut} \times 0.15) \text{ senão } 0$$

5. **Lucro Líquido Final ($Lucro_{liquido}$):**
   Deduz também as despesas recorrentes de holding (que não abatem base de IR):
   $$Lucro_{liquido} = Receita_{base} - Custos_{Dedu} - T_{hold} - IR$$

---

### 4.5. Retorno sobre o Capital Próprio (ROI)

Calculado sob a metodologia Cash-on-Cash Return para refletir a relação de retorno sobre a liquidez de caixa real desembolsada:
$$ROI\% = \text{Se } (Capital_{alocado} > 0) \text{ então } \left( \frac{Lucro_{liquido}}{Capital_{alocado}} \times 100 \right) \text{ senão } 0$$

---

### 4.6. Preenchimento de Órfãos e Filtros de Faturamento no Dashboard
Sempre que o usuário navegar pelo Dashboard Principal, o faturamento total deve desconsiderar qualquer registro associado a um imóvel excluído. 
- O filtro das transações de faturamento órfãs (`orphanBilling`) deve reter apenas os registros de faturamento que genuinamente **não possuem** um `id_imovel` preenchido. 
- Transações com `id_imovel` válido cujo imóvel correspondente não existe mais no repositório de dados ativo são tratadas como transações descontinuadas e **devem ser ignoradas** nos agregadores do Dashboard.

---

## 5. Casos de Testes Críticos Sugeridos

Abaixo estão listados os cenários prioritários que devem ser submetidos a testes de regressão periódicos.

### 5.1. Testes de Regras Financeiras (Unitários)
- **Caso 1: Compra À Vista sem Reforma:**
  - Dado um imóvel de R$ 100.000,00 (`À Vista`), sem custos de holding, extras de aquisição ou faturamento, e valor de avaliação de R$ 150.000,00.
  - O capital alocado tem de ser R$ 100.000,00.
  - O lucro bruto projetado de ser R$ 50.000,00.
  - O imposto de renda retido deve ser R$ 7.500,00.
  - O lucro líquido final deve ser R$ 42.500,00.
  - O ROI líquido deve resultar em exatamente 42,50%.

- **Caso 2: Compra Financiada com Entrada Protegida:**
  - Dado um imóvel de R$ 120.000,00 (`Financiada`), com saldo devedor definido em R$ 130.000,00 (situação inicial de preenchimento errôneo).
  - A entrada efetiva calculada deve travar no valor zero (evitando gerar capital alocado negativo).
  - O Capital Alocado total resultante deve computar estritamente a soma dos demais custos de benfeitorias e despesas acessórias cadastrados.

- **Caso 3: Apuração Fiscal com Venda Efetuada:**
  - Dado um imóvel arrematado à vista por R$ 200.000,00, ITBI/Registro de R$ 10.000,00, reforma de R$ 30.000,00 e vendido com faturamento bruto de R$ 350.000,00 com corretagem de R$ 20.000,00.
  - Faturamento líquido esperado: R$ 330.000,00.
  - Custos dedutíveis de IR ($T_{aq} + T_{ref}$): R$ 210.000,00 + R$ 30.000,00 = R$ 240.000,00.
  - Lucro bruto apurado: R$ 90.000,00.
  - Imposto retido de 15%: R$ 13.500,00.
  - Lucro líquido consolidado: R$ 76.500,00.

### 5.2. Testes de Integração e Sistema (E2E)
- **Registro do Ciclo Completo de um Ativo:**
  1. O usuário cria uma conta e faz login seguro.
  2. Cadastra um imóvel com origem `Leilão Judicial`, preenchendo todos os dados de processo e comarca.
  3. Adiciona três itens extras em "Aquisição" (ITBI, Registro e Comissão).
  4. Adiciona despesas mensais de Holding para dois períodos competentes diferentes.
  5. Aciona o botão de **Geração de Análise Jurídica** e verifica se o relatório gerado por IA é devidamente renderizado e persistido na coluna correspondente do documento.
  6. Efetua o registro da venda do ativo e verifica se os indicadores mudaram instantaneamente de "Viabilidade Projetada" (Baseada em avaliação) para "Desempenho Consolidado" (Baseado no faturamento de venda).
  7. Exclui o Imóvel e assegura que nenhuma receita de faturamento indevida associada ao imóvel excluído permaneça flutuando no dashboard consolidado global.
