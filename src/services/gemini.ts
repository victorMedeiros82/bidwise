import { Imovel } from "../types";
import { auth } from "../lib/firebase";

export async function generateRiskAnalysis(
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
): Promise<string> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Safely retrieve the current authenticated user's ID token from Firebase Authentication
    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      } catch (authErr) {
        console.warn("Could not retrieve Firebase getIdToken:", authErr);
      }
    }

    const response = await fetch('/api/generate-risk-analysis', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imovel,
        financials
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    const data = await response.json();
    return data.analysis || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro ao solicitar análise de risco ao servidor:", error);
    return "Não foi possível gerar a análise no momento devido a instabilidades na rede ou expiração do serviço. Por favor, tente novamente mais tarde.";
  }
}
