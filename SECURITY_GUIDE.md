# 🔒 Guia de Segurança e Arquitetura de Dados • BidWise

Este guia descreve os padrões de engenharia de segurança de alta qualidade, isolamento de dados e governança implementados na plataforma **BidWise**. O sistema foi concebido de forma rigorosa seguindo o princípio do menor privilégio (*Principle of Least Privilege*) para garantir a confidencialidade, integridade e disponibilidade dos dados estratégicos dos investidores.

---

## 🏗️ 1. Governança e Isolamento Multilocatário (Multi-Tenant)

Para evitar vazamento ou cruzamento inadequado de informações confidenciais entre corretores ou investidores, o BidWise emprega um design de isolamento rígido em duas camadas complementares:

### A. Isolamento em nível de API Proxy (Camada Express.js)
Toda requisição para obter (`GET`), modificar (`PATCH`/`PUT`) ou excluir (`DELETE`) dados do portfólio de ativos passa por um middleware de autenticação centralizado.
*   **Identificação via JWT:** O frontend anexa o token de identidade JWT do Firebase (`getIdToken()`) no cabeçalho `Authorization: Bearer <TOKEN>`.
*   **Resgate seguro do ID:** O servidor Express decodifica o JWT localmente de forma segura e extrai o `uid` exclusivo e auditado.
*   **Isolamento de Queries:** Todos os dados retornados nas coleções são filtrados e restritos ao proprietário:
    ```typescript
    documents = documents.filter((doc) => doc.createdBy === uid);
    ```
*   **Bloqueio de Spoofing:** Tentativas de requisição com IDs forjados ou pertencentes a outro usuário são interceptadas com respostas transparentes de `403 Permission Denied`.

### B. Isolamento em nível de Banco de Dados (Firestore Security Rules)
Como redundância de segurança crítica (*Defense in Depth*), as regras de segurança do Google Cloud Firestore barram transações ilegais mesmo que haja contorno na camada proxy:
*   A função `isOwner()` assevera que o usuário autenticado só pode operar registros marcados com seu próprio `uid` no atributo `createdBy`.
*   O acesso cooperativo ou invasivo de qualquer usuário não autorizado é bloqueado no nível físico do banco.

---

## 🛡️ 2. Verificação de Esquema e Proteção contra Injection (NoSQL Injection)

Para afastar infecções de payload, strings gigantescas que causam sobrecarga de memória (Denial of Service) ou poluição de atributos reservados, o sistema emprega validações estritas em tempo de execução:

### A. Sanitização Dinâmica de Entrada (Express Backend)
No endpoint de processamento cognitivo (/api/generate-risk-analysis), os dados recebidos são rigorosamente mapeados e encapsulados em modelos de tamanho finito:
*   **Limitação de Strings:** Campos de texto como endereços, comarcas ou matrículas são cortados em comprimentos máximos pré-determinados (ex. `.substring(0, 500)` para endereços).
*   **Normalização de Tipos de Dados:** Números e valores monetários são submetidos a casting numérico estrito (`Number(val) || 0`) e valores negativos de custos são eliminados via `Math.max(0, ...)`.

### B. Regras de Schema Rígidas (Firestore DB)
As regras definidas no `firestore.rules` especificam restrições de tipos primitivos e limites de tamanho para cada entidade, incluindo:
*   `processo`: Máximo de 200 caracteres.
*   `link_edital`: Máximo de 2000 caracteres.
*   Enums restritivos para os estados das arrematações, origens, conservação do imóvel e natureza dos leilões.

---

## 🔑 3. Proteção e Custódia de Chaves de API (Quota Protection)

Seguindo as diretivas gerais de segurança do ecossistema Google AI Studio:
*   **Isolação de Chaves:** A chave de API do Gemini (`GEMINI_API_KEY`) reside exclusivamente no ambiente privado do servidor de execução de contêineres (*Cloud Run Container*). **Nenhuma** chave é exposta ou visível no navegador do cliente (DevTools ou rede).
*   **Prevenção contra Abuso de Cota:** O endpoint `/api/generate-risk-analysis` foi completamente blindado. Ele exige autenticação ativa do usuário por token Firebase para processar quaisquer solicitações. Isso impede que agentes maliciosos externos façam requisições em massa e esgotem o saldo ou limite de uso de sua chave de API.

---

## 📈 4. Matriz de Conformidade de Risco e Práticas recomendadas para o Operador

| Ameaça Detectada | Vetor de Risco | Medida Mitigadora BidWise | Status |
| :--- | :--- | :--- | :--- |
| **Invasão de Conta** | Brute force de senhas fracas | Suporte a Google Identity Provider (OAuth 2.0 com MFA opcional) | **Ativo** |
| **Sequestro de Sessão** | Tokens expirados ou roubados | Rotação automática de Tokens de Sessão pelo Firebase SDK | **Ativo** |
| **Abuso de endpoint de IA** | Spam de requisições no LLM | Bloqueio de chamadas sem token válido em `/api/*` | **Ativo** |
| **Acesso Cruzado (XDA)** | Vazamento de relatórios entre usuários | Filtro server-side rigoroso por `createdBy` e validação do token | **Ativo** |
