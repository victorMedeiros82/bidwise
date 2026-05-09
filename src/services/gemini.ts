import { GoogleGenAI } from "@google/genai";
import { Imovel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateRiskAnalysis(
  imovel: Imovel, 
  _leilao?: any, 
  financials?: { 
    totalInvestimento: number; 
    lucroEstimado: number; 
    roiEstimado: number; 
    totalReforma: number;
    totalHolding: number;
    faturamentoLiquido: number;
  }
) {
  const leilaoInfo = imovel.origem === 'Leilão' && imovel.processo ? `
    DADOS DO LEILÃO INTEGRADOS:
    - Processo: ${imovel.processo}
    - Comarca: ${imovel.comarca}
    - Tipo: ${imovel.tipo_leilao || 'Não especificado'}
    - Valor Mínimo: R$ ${imovel.valor_minimo?.toLocaleString('pt-BR')}
    - Valor Avaliação: R$ ${imovel.valor_avaliacao?.toLocaleString('pt-BR')}
    - Forma de Arrematação: ${imovel.forma_arrematacao}
  ` : `
    DADOS DE AQUISIÇÃO:
    - Origem: ${imovel.origem}
  `;

  const financialInfo = financials ? `
    DADOS FINANCEIROS CONSOLIDADOS:
    - Total Investimento (Estimado): R$ ${financials.totalInvestimento.toLocaleString('pt-BR')}
    - Total em Reformas: R$ ${financials.totalReforma.toLocaleString('pt-BR')}
    - Custos de Holding/Mensais: R$ ${financials.totalHolding.toLocaleString('pt-BR')}
    - Faturamento Líquido Esperado: R$ ${financials.faturamentoLiquido.toLocaleString('pt-BR')}
    - Lucro Bruto Estimado: R$ ${financials.lucroEstimado.toLocaleString('pt-BR')}
    - ROI Estimado: ${financials.roiEstimado.toFixed(2)}%
  ` : "";

  const prompt = `
    Como um especialista jurídico e de investimentos imobiliários no Brasil (especialmente focado em leilões e oportunidades de mercado), analise os seguintes dados e gere um relatório de análise de risco e viabilidade.
    
    ${leilaoInfo}
    ${financialInfo}
    
    DADOS DO IMÓVEL:
    - Endereço: ${imovel.endereco}
    - Matrícula: ${imovel.matricula}
    - Tipo de Imóvel: ${imovel.tipo_imovel}
    - Situação Jurídica: ${imovel.situacao_juridica}
    - Estado de Conservação: ${imovel.estado_conservacao}
    - Área: ${imovel.area_m2}m²
    
    Por favor, forneça:
    1. Resumo dos Riscos Jurídicos (Baseado na situação jurídica e origem).
    2. Análise de Viabilidade Financeira (Use os dados consolidados se fornecidos).
    3. Pontos de Atenção (Ocupação, débitos de condomínio/IPTU, etc).
    4. Recomendação Final.
    
    Responda em Português e use Markdown para formatação.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro ao gerar análise de risco:", error);
    return "Não foi possível gerar a análise no momento.";
  }
}
