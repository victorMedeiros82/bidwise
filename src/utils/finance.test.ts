import { describe, it, expect } from 'vitest';
import { calculateFinance } from './finance';
import { 
  Imovel, 
  CustoAquisicao, 
  CustoReforma, 
  Holding, 
  Faturamento, 
  TipoArrematacao,
  OrigemImovel,
  TipoImovel,
  SituacaoJuridica,
  EstadoConservacao,
  StatusArrematacao,
  StatusPagamento,
  TipoFaturamento
} from '../types';

describe('Cálculos Financeiros do Ativo - BidWise', () => {

  const emptyBaseImovel: Imovel = {
    id: 'prop-123',
    origem: OrigemImovel.CompraDireta,
    matricula: '12345',
    endereco: 'Rua Principal, 100',
    area_m2: 50,
    tipo_imovel: TipoImovel.Apartamento,
    situacao_juridica: SituacaoJuridica.Outro,
    estado_conservacao: EstadoConservacao.Bom,
    status_arrematacao: StatusArrematacao.Arrematado,
    createdBy: 'user-999'
  };

  it('Caso 1: Compra À Vista sem Reforma', () => {
    // Caso 1: Compra À Vista sem Reforma:
    // - Dado um imóvel de R$ 100.000,00 (À Vista), sem custos de holding, extras de aquisição ou faturamento, e valor de avaliação de R$ 150.000,00.
    // - O capital alocado tem de ser R$ 100.000,00.
    // - O lucro bruto projetado de ser R$ 50.000,00.
    // - O imposto de renda retido deve ser R$ 7.500,00.
    // - O lucro líquido final deve ser R$ 42.500,00.
    // - O ROI líquido deve resultar em exatamente 42,50%.

    const imovel: Imovel = {
      ...emptyBaseImovel,
      valor_arrematacao: 100000,
      tipo_arrematacao: TipoArrematacao.AVista,
      valor_avaliacao: 150000
    };

    const res = calculateFinance(imovel, [], [], [], []);

    expect(res.capitalAlocado).toBe(100000);
    expect(res.lucroBruto).toBe(50000);
    expect(res.impostoRenda).toBe(7500);
    expect(res.lucroLiquido).toBe(42500);
    expect(res.roi).toBe(42.50);
  });

  it('Caso 2: Compra Financiada com Entrada Protegida', () => {
    // Caso 2: Compra Financiada com Entrada Protegida:
    // - Dado um imóvel de R$ 120.000,00 (Financiada), com saldo devedor definido em R$ 130.000,00 (situação inicial de preenchimento errôneo).
    // - A entrada efetiva calculada deve travar no valor zero (evitando gerar capital alocado negativo).
    // - O Capital Alocado total resultante deve computar estritamente a soma dos demais custos de benfeitorias e despesas acessórias cadastrados.

    const imovel: Imovel = {
      ...emptyBaseImovel,
      valor_arrematacao: 120000,
      tipo_arrematacao: TipoArrematacao.Financiada,
      saldo_devedor: 130000
    };

    // Adicionamos custos extras de aquisição e reforma para aferir se o capital alocado soma estritamente essas parcelas
    const custosAquisicao: CustoAquisicao[] = [
      {
        id_imovel: 'prop-123',
        tipo_custo: 'ITBI',
        valor: 5000,
        status_pagamento: StatusPagamento.Pago,
        createdBy: 'user-999'
      }
    ];

    const custosReforma: CustoReforma[] = [
      {
        id_imovel: 'prop-123',
        descricao_etapa: 'Pintura',
        orcamento: 15000,
        valor_real: 12000, // deve preferir o valor_real
        createdBy: 'user-999'
      }
    ];

    const holding: Holding[] = [
      {
        id_imovel: 'prop-123',
        tipo_despesa: 'Condomínio',
        valor_mensal: 800,
        competencia: '05/2026',
        createdBy: 'user-999'
      }
    ];

    const res = calculateFinance(imovel, custosAquisicao, custosReforma, holding, []);

    expect(res.entradaEfetiva).toBe(0); // Garante a trava Math.max(0, V_arr - S_dev)
    // O Capital Alocado total esperado é: Entrada Efetiva (0) + C_aq (5.000) + T_ref (12.000) + T_hold (800) = 17.800
    expect(res.capitalAlocado).toBe(17800);
  });

  it('Caso 3: Apuração Fiscal com Venda Efetuada', () => {
    // Caso 3: Apuração Fiscal com Venda Efetuada:
    // - Dado um imóvel arrematado à vista por R$ 200.000,00, ITBI/Registro de R$ 10.000,00, reforma de R$ 30.000,00 e vendido com faturamento bruto de R$ 350.000,00 com corretagem de R$ 20.000,00.
    // - Faturamento líquido esperado: R$ 330.000,00.
    // - Custos dedutíveis de IR ($T_{aq} + T_{ref}$): R$ 210.000,00 + R$ 30.000,00 = R$ 240.000,00.
    // - Lucro bruto apurado: R$ 90.000,00.
    // - Imposto retido de 15%: R$ 13.500,00.
    // - Lucro líquido consolidado: R$ 76.500,00.

    const imovel: Imovel = {
      ...emptyBaseImovel,
      valor_arrematacao: 200000,
      tipo_arrematacao: TipoArrematacao.AVista,
    };

    const custosAquisicao: CustoAquisicao[] = [
      {
        id_imovel: 'prop-123',
        tipo_custo: 'ITBI e Registro',
        valor: 10000,
        status_pagamento: StatusPagamento.Pago,
        createdBy: 'user-999'
      }
    ];

    const custosReforma: CustoReforma[] = [
      {
        id_imovel: 'prop-123',
        descricao_etapa: 'Reforma Completa',
        orcamento: 30000,
        valor_real: 30000,
        createdBy: 'user-999'
      }
    ];

    const faturamento: Faturamento[] = [
      {
        id_imovel: 'prop-123',
        tipo: TipoFaturamento.Venda,
        valor: 350000,
        custo_corretagem: 20000,
        createdBy: 'user-999'
      }
    ];

    const res = calculateFinance(imovel, custosAquisicao, custosReforma, [], faturamento);

    expect(res.faturamentoLiquido).toBe(330000);
    expect(res.totalAquisicao).toBe(210000);
    expect(res.totalReforma).toBe(30000);
    expect(res.lucroBruto).toBe(90000);
    expect(res.impostoRenda).toBe(13500);
    expect(res.lucroLiquido).toBe(76500);
  });

  it('Verifica o uso de valor_minimo caso valor_arrematacao seja omitido', () => {
    const imovel: Imovel = {
      ...emptyBaseImovel,
      valor_minimo: 80000,
      tipo_arrematacao: TipoArrematacao.AVista,
      valor_avaliacao: 120000
    };

    const res = calculateFinance(imovel, [], [], [], []);
    expect(res.valorArrematacaoBase).toBe(80000);
    expect(res.capitalAlocado).toBe(80000);
  });

  it('Verifica imposto zero ou retorno correto se lucro bruto for negativo', () => {
    const imovel: Imovel = {
      ...emptyBaseImovel,
      valor_arrematacao: 150000,
      tipo_arrematacao: TipoArrematacao.AVista,
      valor_avaliacao: 120000 // Menor do que a arrematação, simulando prejuízo projetado
    };

    const res = calculateFinance(imovel, [], [], [], []);
    expect(res.lucroBruto).toBe(-30000);
    expect(res.impostoRenda).toBe(0); // Sem imposto sobre prejuízo
    expect(res.lucroLiquido).toBe(-30000);
  });
});
