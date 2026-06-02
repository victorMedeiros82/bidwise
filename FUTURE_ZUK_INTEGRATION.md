# 📄 Estudo de Viabilidade e Planejamento: Integração com Portal Zuk • BidWise

Este documento detalha o planejamento estratégico e a especificação funcional de alto nível para a funcionalidade de consulta, raspagem dinâmica e importação automática de ativos da **Zuk Leilões (Portal Zuk)** para a plataforma de gestão e análise jurídica **BidWise**, prevista para uma versão futura do sistema.

---

## 🎯 1. Escopo e Propósito

O objetivo deste recurso é permitir que investidores e analistas de leilões busquem ativamente imóveis em tempo real na base do Portal Zuk diretamente da interface do **BidWise**, avaliem instantaneamente o ROI através de nossos simuladores analíticos, executem o relatório de viabilidade de risco de posse através da IA e importem o ativo com um único clique para o portfólio de despesas e tarefas da plataforma.

A validação preliminar desta funcionalidade provou que:
*   Reduz em até **80%** o esforço manual de transcrever dados de editais e matrículas obtidos no portal de origem.
*   Auxilia no garimpo ágil de oportunidades através de pesquisas cruzadas com suporte a IA e Grounding do Google Search.

---

## 🛠️ 2. Arquitetura Planejada para a Integração Estável

Para evitar bloqueios de taxa de requisição (*rate limiting*) ou sobrecarga de recursos de processamento, a arquitetura final contemplará três pilares fundamentais:

```
[Portal Zuk / API] ──(Web Scraper & Crawler)──► [Cache de Curadoria / DB] ──► [Interface BidWise]
                                                         ▲
                                                         │
                                             (Gemini Flash OCR & Grounding)
```

### A. Camada de Agente Extrator (Cron Web Scraper)
*   **Mapeamento e Extração:** Criação de um crawler server-side estruturado para mapear novos editais publicados no Portal Zuk diariamente.
*   **Coleta Documental:** Extração automática de documentos em PDF de editais e matrículas para pré-processamento.
*   **Parse por IA (OCR):** Uso das capacidades de visão e leitura de documentos longos do Gemini para estruturar as informações de endereço, processo judicial, comarca, valor de avaliação, lances mínimos de primeiro e segundo leilões e situação ocupacional.

### B. Camada de Cache & Indexação Local
*   **Armazenamento Eficiente:** Indexação dos leilões raspados em um banco de dados dedicado (como Firestore) com validade curta (TTL de 24 horas), garantindo dados sempre novos e reduzindo buscas repetidas no site de leilões.
*   **Mecanismo de Pesquisa Textual:** Fornecer buscas textuais rápidas por município, bairro, classificação do leilão (judicial/extrajudicial) e deságio (porcentagem de desconto sobre a avaliação oficial).

### C. Importação Compartilhada de Fluxo de Trabalho (Workflow Integration)
*   **Importação 1-Click:** Criação de uma ponte no frontend que converte o formato de dado do leilão em um modelo do tipo `Imovel` padrão, salvando o novo ativo para monitoramento e análise de viabilidade financeira.

---

## 📊 3. Especificação de Dados do Modelo

O leilão que será lido e consolidado para importação possuirá os seguintes campos correspondentes:

| Campo do Ativo | Tipo | Descrição / Automação |
| :--- | :--- | :--- |
| `codigo` | String | Código de identificação oficial no Portal Zuk para fácil auditoria. |
| `titulo` | String | Resumo compreensível do anúncio para identificação. |
| `origem` | Enum | Classificação como judicial ou extrajudicial para cálculo de rito. |
| `endereco` | String | Endereço completo localizado geograficamente. |
| `bairro` | String | Bairro para análises locais de liquidez imobiliária. |
| `cidade` / `estado` | String | Praça geográfica do ativo. |
| `area_m2` | Número | Área total reportada na matrícula. |
| `valor_avaliacao` | Número | Valor estimado do laudo pericial para cálculo do deságio. |
| `valor_minimo` | Número | Lance mínimo estipulado no edital de praça. |
| `data_leilao` | Date | Data agendada da praça de fechamento. |
| `link_edital` | String | Endereço web do documento PDF público do leilão. |

---

## 📈 4. Cronograma de Lançamento e Próximos Passos

1.  **Habilitação de Parcerias:** Verificação de termos de uso de dados e verificação de possibilidade de parceria por API WebHook segura junto ao ecossistema técnico do Portal Zuk.
2.  **Desenvolvedor Sandbox:** Implementação de teste de estresse de scraping em sandbox isolada da plataforma.
3.  **Lançamento em Beta Fechado:** Disponibilização da aba de busca de leilões para usuários Premium do sistema para feedback operacional e otimização dos termos de IA.
