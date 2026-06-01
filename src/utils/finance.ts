import { 
  Imovel, 
  CustoAquisicao, 
  CustoReforma, 
  Holding, 
  Faturamento, 
  TipoArrematacao 
} from '../types';

export interface FinanceResult {
  valorArrematacaoBase: number;
  totalCustosAquisicao: number;
  totalAquisicao: number;
  totalReforma: number;
  totalHolding: number;
  faturamentoBruto: number;
  totalComissoes: number;
  faturamentoLiquido: number;
  entradaEfetiva: number;
  capitalAlocado: number;
  receitaBase: number;
  lucroBruto: number;
  impostoRenda: number;
  lucroLiquido: number;
  roi: number;
}

export function calculateFinance(
  imovel: Imovel,
  custosAquisicao: CustoAquisicao[] = [],
  custosReforma: CustoReforma[] = [],
  holding: Holding[] = [],
  faturamento: Faturamento[] = []
): FinanceResult {
  // 1. Valor de Arrematação Base (V_arr)
  const valorArrematacaoBase = imovel.valor_arrematacao || imovel.valor_minimo || 0;

  // Filter to keep only those corresponding to this property
  const pId = imovel.id;
  const filteredCustosAquisicao = custosAquisicao.filter(c => c.id_imovel === pId);
  const filteredCustosReforma = custosReforma.filter(r => r.id_imovel === pId);
  const filteredHolding = holding.filter(h => h.id_imovel === pId);
  const filteredFaturamento = faturamento.filter(f => f.id_imovel === pId);

  // 2. Total de Custos Extras de Aquisição (C_aq)
  const totalCustosAquisicao = filteredCustosAquisicao.reduce((acc, curr) => acc + (curr.valor || 0), 0);

  // 3. Total de Gastos de Aquisição Geral (T_aq)
  const totalAquisicao = valorArrematacaoBase + totalCustosAquisicao;

  // 4. Total de Custos de Reforma (T_ref)
  const totalReforma = filteredCustosReforma.reduce(
    (acc, curr) => acc + (curr.valor_real !== undefined && curr.valor_real !== null ? curr.valor_real : (curr.orcamento || 0)), 
    0
  );

  // 5. Total de Despesas Fixas Mensais/Holding (T_hold)
  const totalHolding = filteredHolding.reduce((acc, curr) => acc + (curr.valor_mensal || 0), 0);

  // 6. Faturamento Bruto (F_bruto)
  const faturamentoBruto = filteredFaturamento.reduce((acc, curr) => acc + (curr.valor || 0), 0);

  // 7. Total de Comissões de Corretagem (C_corr)
  const totalComissoes = filteredFaturamento.reduce((acc, curr) => acc + (curr.custo_corretagem || 0), 0);

  // 8. Faturamento Líquido (F_liq)
  const faturamentoLiquido = faturamentoBruto - totalComissoes;

  // 9. Entrada Efetiva (Ent_ef)
  const saldoDevedor = imovel.saldo_devedor || 0;
  const entradaEfetiva = imovel.tipo_arrematacao === TipoArrematacao.Financiada
    ? Math.max(0, valorArrematacaoBase - saldoDevedor)
    : valorArrematacaoBase;

  // 10. Capital Alocado Total (Capital_alocado)
  const capitalAlocado = entradaEfetiva + totalCustosAquisicao + totalReforma + totalHolding;

  // 11. Base de Cálculo de Receita (Receita_base)
  const receitaBase = faturamentoLiquido > 0 ? faturamentoLiquido : (imovel.valor_avaliacao || 0);

  // 12. Custos Base para Dedução (Custos_Dedu)
  const custosDedu = totalAquisicao + totalReforma;

  // 13. Lucro Bruto para Computação Fiscal (Lucros_brut)
  const lucroBruto = receitaBase - custosDedu;

  // 14. Imposto de Renda (IR)
  const impostoRenda = lucroBruto > 0 ? lucroBruto * 0.15 : 0;

  // 15. Lucro Líquido Final (Lucro_liquido)
  // Deduct costs deducible from IR, holding expenses (not deductible), and IR.
  // Equiv to: Receita_base - Custos_Dedu - T_hold - IR
  const lucroLiquido = receitaBase - custosDedu - totalHolding - impostoRenda;

  // 16. ROI%
  const roi = capitalAlocado > 0 ? (lucroLiquido / capitalAlocado) * 100 : 0;

  return {
    valorArrematacaoBase,
    totalCustosAquisicao,
    totalAquisicao,
    totalReforma,
    totalHolding,
    faturamentoBruto,
    totalComissoes,
    faturamentoLiquido,
    entradaEfetiva,
    capitalAlocado,
    receitaBase,
    lucroBruto,
    impostoRenda,
    lucroLiquido,
    roi,
  };
}
