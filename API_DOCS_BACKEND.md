# Documento de Especificação de API para Testes de Backend - BidWise (Prop-Maestro)

Este guia documenta o comportamento das interfaces de backend do ecossistema **BidWise (Prop-Maestro)**. Sob uma arquitetura moderna serverless e distribuída, a "API de Backend" e a camada de controle de dados dividem-se em dois principais pilares:
1. **Firebase Firestore & Regras de Acesso (API de Dados):** Onde as coleções atuam como endpoints REST implícitos de dados persistentes protegidos pelas diretivas declarativas do `firestore.rules`.
2. **Serviços de IA (Gemini 3.5/3 Flash):** Módulo de processamento de linguagem natural destinado à inferência sob os relatórios de ativos imobiliários.

Este documento provê a especificação exata de esquemas de coleções, restrições estruturais de regras, contratos de payload e diretrizes para automação de testes do backend.

---

## 1. Arquitetura Conceitual dos Endpoints de Dados

Como os dados são persistidos diretamente pelo frontend mediante o Firebase Client SDK, os testes de backend têm como foco a validação das **Regras de Segurança** e da **Consistência de Esquemas**. 

Cada coleção do Firestore funciona logicamente como um endpoint exposto aos usuários autenticados.

### Contexto de Autenticação Comum
Todas as requisições autenticadas devem carregar no contexto de segurança do banco (`request.auth`):
- `request.auth.uid`: Uma String não nula representando o identificador único do usuário no Firebase Auth.

---

## 2. Especificação de Coleções (Foco em Testes de Integração e Schema)

### 2.1. Coleção: `/imoveis`
Representa os ativos imobiliários centrais cadastrados.

#### Operações e Direitos de Acesso
- **Criar (Create):** Permitido se o remetente enviar `createdBy` equivalente ao seu próprio `auth.uid`.
- **Ler (Read):** Permitido apenas se a propriedade `createdBy` corresponder ao UID do usuário que faz a consulta.
- **Atualizar (Update):** Permitido apenas para o proprietário (`createdBy == auth.uid`) e impedindo a alteração do criador original do registro.
- **Excluir (Delete):** Permitido apenas para o proprietário do registro.

#### Payload de Exemplo (JSON para Mocking e Testes)
```json
{
  "codigo": "IMV-001",
  "origem": "Leilão Judicial",
  "matricula": "12345/RGI-SP",
  "endereco": "Av. Paulista, 1000 - Bela Vista - São Paulo/SP",
  "cep": "01310-100",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "estado": "SP",
  "area_m2": 72.5,
  "tipo_imovel": "Apartamento",
  "situacao_juridica": "Alienação Fiduciária",
  "estado_conservacao": "Regular",
  "status_arrematacao": "Arrematado",
  "valor_arrematacao": 350000,
  "tipo_arrematacao": "Financiada",
  "saldo_devedor": 210000,
  "processo": "1002345-67.2025.8.26.0100",
  "comarca": "2ª Vara Cível de São Paulo",
  "tipo_leilao": "Judicial",
  "data_leilao": "2026-05-15",
  "link_edital": "https://leiloes-exemplo.com/edital_123.pdf",
  "valor_avaliacao": 500000,
  "valor_minimo": 300000,
  "forma_arrematacao": "Online",
  "condicoes_pagamento": "Entrada de 25% + saldo em até 30 parcelas reajustáveis.",
  "createdAt": "2026-05-30T19:00:00.000Z",
  "updatedAt": "2026-05-30T19:30:00.000Z",
  "createdBy": "USER_ID_ALVO"
}
```

---

### 2.2. Coleção: `/custos_aquisicao`
Custos de consolidação da propriedade imediata pós-leilão.

#### Operações de Segurança
- Permitido o CRUD completo condicionado a:
  - O usuário estar autenticado.
  - O imóvel pai correspondente existir e pertencer ao mesmo usuário do banco de dados (recomenda-se testar a integridade relacional entre o `id_imovel` e os dados do imóvel).

#### Payload de Exemplo
```json
{
  "id_imovel": "imovel_xyz_123",
  "tipo_custo": "ITBI",
  "valor": 10500,
  "data_vencimento": "2026-06-10",
  "status_pagamento": "Pago",
  "fileUrl": "https://storage.googleapis.com/test-bucket/comprovante_itbi.pdf"
}
```

---

### 2.3. Coleção: `/custos_reforma`
Gastos de captação e valorização física do imóvel.

#### Payload de Exemplo
```json
{
  "id_imovel": "imovel_xyz_123",
  "descricao_etapa": "Reforma da Cozinha e Pintura",
  "orcamento": 25000,
  "valor_real": 22400,
  "prazo_execucao": "30 dias",
  "data_conclusao": "2026-06-15",
  "fileUrl": "https://storage.googleapis.com/test-bucket/nf_reforma_01.pdf"
}
```

---

### 2.4. Coleção: `/holding`
Despesas mensais operacionais e fixas do ativo imobiliário enquanto mantido no portfólio.

#### Payload de Exemplo
```json
{
  "id_imovel": "imovel_xyz_123",
  "tipo_despesa": "Condomínio",
  "valor_mensal": 650,
  "competencia": "05/2026",
  "fileUrl": "https://storage.googleapis.com/test-bucket/boleto_condominio_maio.pdf"
}
```

---

### 2.5. Coleção: `/faturamento`
Documenta as operações comerciais de liquidação do ativo.

#### Payload de Exemplo
```json
{
  "id_imovel": "imovel_xyz_123",
  "tipo": "Venda",
  "valor": 480000,
  "data_operacao": "2026-08-20",
  "custo_corretagem": 24000,
  "fileUrl": "https://storage.googleapis.com/test-bucket/escritura_venda.pdf"
}
```

---

## 3. Especificação do Módulo de IA (Gemini API)

A aplicação consome os modelos generativos da Google diretamente de forma serverless, isolando as credenciais no lado do servidor/ambiente seguro do runtime do container. 

### 3.1. Assinatura do Contrato do SDK
```typescript
async function generateRiskAnalysis(
  imovel: Imovel, 
  _leilao?: any, 
  financials?: { 
    totalInvestimento: number; 
    lucroBruto: number;
    impostoRenda: number;
    lucroLiquido: number;
    roiLiquido: number;
    totalReforma: number;
    totalHolding: number;
    faturamentoLiquido: number;
  }
): Promise<string>
```

### 3.2. Payload do Prompt Gerado à IA
Ao simular chamadas de IA em testes unitários de backend, deve-se verificar se os campos chave foram consolidados e envelopados no seguinte formato de entrada do modelo:

1. **Parâmetros de Entrada:**
   ```json
   {
     "modelo": "gemini-3-flash-preview",
     "conteudo": "Como um especialista jurídico e de investimentos imobiliários no Brasil... DADOS DO IMÓVEL... DADOS FINANCEIROS CONSOLIDADOS..."
   }
   ```
2. **Requisitos Obrigatórios para Validação de Segurança do Prompt (Sanitization):**
   - Garantir que `imovel.matricula`, `imovel.processo` e dados financeiros são injetados de forma sanitizada.
   - Impedir injeções de scripts controlando strings de entrada de endereço e comarca.

3. **Validação de Estrutura de Retorno (Asserts):**
   - A resposta deve ser uma string em formato **Markdown (UTF-8)**.
   - Deve conter obrigatoriamente as seções indicadas no prompt:
     - `Resumo dos Riscos Jurídicos`
     - `Análise de Viabilidade Financeira`
     - `Pontos de Atenção`
     - `Recomendação Final`

---

## 4. Testes do Backend Utilizando o Firebase Emulator Suite

A maneira recomendada para executar e automatizar testes de backend para as coleções do Firebase é usar o `@firebase/rules-unit-testing`. Isso permite testar as regras de acesso sem encarecer custos de nuvem e de forma offline.

### 4.1. Setup Inicial dos Testes de Backend (Exemplo em Jest/Vitest)
```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-bidwise-app",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});
```

### 4.2. Casos de Testes Críticos de Regras de Backend

#### Teste 1: Bloquear leitura de propriedades de outros usuários (Multi-tenant)
```typescript
it("deve rejeitar leitura de imóvel caso o UID do criador seja diferente do usuário autenticado", async () => {
  const aliceContext = testEnv.authenticatedContext("alice_uid");
  const bobContext = testEnv.authenticatedContext("bob_uid");
  
  // Alice cria seu imóvel
  await aliceContext.firestore().collection("imoveis").doc("imovel_da_alice").set({
    endereco: "Rua A",
    createdBy: "alice_uid",
    status_arrematacao: "Análise",
    area_m2: 50,
    matricula: "001"
  });

  // Bob tenta visualizar o imóvel da Alice
  const bobReadOnly = bobContext.firestore().collection("imoveis").doc("imovel_da_alice");
  await expect(bobReadOnly.get()).rejects.toThrow();
});
```

#### Teste 2: Rejeitar criação de Registros Indiretos Órfãos
```typescript
it("deve proibir criação de faturamento sem ID de imóvel pai válido de propriedade do usuário", async () => {
  const aliceContext = testEnv.authenticatedContext("alice_uid");
  
  // Tenta cadastrar um faturamento solto de um id_imovel inexistente
  const faturamentoInvalido = aliceContext.firestore().collection("faturamento").doc("fat_test");
  await expect(faturamentoInvalido.set({
    id_imovel: "", // Vazio ou inexistente
    tipo: "Venda",
    valor: 450000
  })).rejects.toThrow();
});
```

---

## 5. Matriz de Erros de Backend Comuns (para depuração em testes)

| Código de Erro | Causa Provável nos Testes | Resolução Sugerida |
| :--- | :--- | :--- |
| `PERMISSION_DENIED` | Tentativa de ler/escrever dados em que `createdBy` não coincide com o UID autenticado. | Verificar se o mock de autenticação possui o mesmo UID do campo `createdBy` do objeto. |
| `INVALID_ARGUMENT` | Campo enviado possui tipo incompatível com o esperado no Firestore ou excede tipos delimitados. | Validar tipagem no script de teste em conformidade com o `PROJETO_ESPECIFICACAO.md`. |
| `API_KEY_INVALID` | Variável de ambiente `GEMINI_API_KEY` ausente nas configurações de testes de IA. | Garantir a injeção da variável no contexto do executor do teste de IA. |
