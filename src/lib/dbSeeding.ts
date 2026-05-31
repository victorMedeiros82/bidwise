import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { supabase } from './supabase';
import { 
  StatusArrematacao, 
  OrigemImovel, 
  TipoImovel, 
  SituacaoJuridica, 
  EstadoConservacao, 
  TipoLeilao, 
  FormaArrematacao, 
  TipoArrematacao, 
  StatusPagamento, 
  StatusDoc 
} from '../types';

export const seedDatabaseForUser = async (uid: string) => {
  const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (hasSupabase) {
    try {
      // 1. Check if we already have records for this user in table 'imoveis'
      const { data: existing, error: checkErr } = await supabase
        .from('imoveis')
        .select('id')
        .eq('createdBy', uid)
        .limit(1);

      if (!checkErr && (!existing || existing.length === 0)) {
        console.log('Seeding Supabase database for user', uid);
        
        const imovelPayload = {
          codigo: 'PROP-001',
          origem: OrigemImovel.LeilaoJudicial,
          matricula: '12345',
          cep: '01311200',
          endereco: 'Avenida Paulista, 1000',
          bairro: 'Bela Vista',
          cidade: 'São Paulo',
          estado: 'SP',
          area_m2: 120,
          tipo_imovel: TipoImovel.Apartamento,
          situacao_juridica: SituacaoJuridica.ExecucaoFiscal,
          estado_conservacao: EstadoConservacao.Bom,
          analise_risco: '# Análise de Risco e Viabilidade Jurídica\\n\\nEste imóvel apresenta excelente relação de risco-retorno.\\n\\n### Aspectos Positivos\\n- Localização privilegiada de altíssima liquidez.\\n- Avaliação de mercado conservadora.\\n- Processo de execução bem respaldado.',
          status_arrematacao: StatusArrematacao.Arrematado,
          valor_arrematacao: 200000,
          tipo_arrematacao: TipoArrematacao.Financiada,
          saldo_devedor: 130000,
          processo: '0001234-56.2026.8.26.0100',
          comarca: '1ª Vara de Execuções Civis',
          tipo_leilao: TipoLeilao.Judicial,
          data_leilao: '2026-06-15',
          link_edital: 'https://leilao.exemplo.com/edital/12345',
          valor_avaliacao: 300000,
          valor_minimo: 180000,
          forma_arrematacao: FormaArrematacao.Online,
          condicoes_pagamento: 'Entrada minima de 25% + saldo em ate 30 parcelas corrigidas.',
          createdBy: uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Try to insert imovel
        let insertedId: any = 'SaRtriImjf0vgC2cOjLI';
        const { data: r1, error: e1 } = await supabase
          .from('imoveis')
          .insert({ id: insertedId, ...imovelPayload })
          .select();

        if (e1) {
          const { data: r2, error: e2 } = await supabase
            .from('imoveis')
            .insert(imovelPayload)
            .select();

          if (e2) {
            console.warn('Could not seed imoveis table in Supabase. Perhaps tables do not exist yet.', e2);
          } else if (r2 && r2[0]) {
            insertedId = r2[0].id;
          }
        } else if (r1 && r1[0]) {
          insertedId = r1[0].id;
        }

        if (insertedId) {
          // Custos Aquisição
          const custoAquisicaoPayload = {
            id_imovel: insertedId,
            tipo_custo: 'ITBI',
            descricao: 'Imposto de Transmissão de Bens Imóveis',
            valor: 8000,
            data_vencimento: '2026-06-30',
            status_pagamento: StatusPagamento.Pendente,
            createdBy: uid,
            createdAt: new Date().toISOString()
          };
          await supabase.from('custos_aquisicao').insert(custoAquisicaoPayload);

          // Documentos
          const documentoPayload = {
            id_imovel: insertedId,
            tipo_doc: 'Carta de Arrematação',
            status: StatusDoc.Pendente,
            data_recebimento: '2026-06-20',
            data_vencimento: '2026-07-20',
            responsavel: 'Broker Principal',
            createdBy: uid,
            createdAt: new Date().toISOString()
          };
          await supabase.from('documentos').insert(documentoPayload);

          // Custos Reforma
          const custoReformaPayload = {
            id_imovel: insertedId,
            descricao_etapa: 'Pintura Geral e Acabamento',
            orcamento: 15000,
            valor_real: 12000,
            prazo_execucao: '15 dias',
            data_conclusao: '2026-06-25',
            createdBy: uid,
            createdAt: new Date().toISOString()
          };
          await supabase.from('custos_reforma').insert(custoReformaPayload);

          // Holding
          const holdingPayload = {
            id_imovel: insertedId,
            tipo_despesa: 'Condomínio',
            descricao: 'Taxa condominial ordinária',
            valor_mensal: 500,
            competencia: '06/2026',
            createdBy: uid,
            createdAt: new Date().toISOString()
          };
          await supabase.from('holding').insert(holdingPayload);

          console.log('Successfully completed Supabase seeding for user', uid);
        }
      }
    } catch (err) {
      console.error('Supabase seeding error:', err);
    }
  }

  try {
    const imovelRef = doc(db, 'imoveis', 'SaRtriImjf0vgC2cOjLI');
    const imovelSnap = await getDoc(imovelRef);

    if (!imovelSnap.exists()) {
      // 1. Seed Imovel
      await setDoc(imovelRef, {
        codigo: 'PROP-001',
        origem: OrigemImovel.LeilaoJudicial,
        matricula: '12345',
        cep: '01311200',
        endereco: 'Avenida Paulista, 1000',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
        area_m2: 120,
        tipo_imovel: TipoImovel.Apartamento,
        situacao_juridica: SituacaoJuridica.ExecucaoFiscal,
        estado_conservacao: EstadoConservacao.Bom,
        analise_risco: '# Análise de Risco e Viabilidade Jurídica\n\nEste imóvel apresenta excelente relação de risco-retorno.\n\n### Aspectos Positivos\n- Localização privilegiada de altíssima liquidez.\n- Avaliação de mercado conservadora.\n- Processo de execução bem respaldado.',
        status_arrematacao: StatusArrematacao.Arrematado,
        valor_arrematacao: 200000,
        tipo_arrematacao: TipoArrematacao.Financiada,
        saldo_devedor: 130000,
        processo: '0001234-56.2026.8.26.0100',
        comarca: '1ª Vara de Execuções Civis',
        tipo_leilao: TipoLeilao.Judicial,
        data_leilao: '2026-06-15',
        link_edital: 'https://leilao.exemplo.com/edital/12345',
        valor_avaliacao: 300000,
        valor_minimo: 180000,
        forma_arrematacao: FormaArrematacao.Online,
        condicoes_pagamento: 'Entrada minima de 25% + saldo em ate 30 parcelas corrigidas.',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Seed CustoAquisicao
      await setDoc(doc(db, 'custos_aquisicao', 'custo-itbi'), {
        id_imovel: 'SaRtriImjf0vgC2cOjLI',
        tipo_custo: 'ITBI',
        descricao: 'Imposto de Transmissão de Bens Imóveis',
        valor: 8000,
        data_vencimento: '2026-06-30',
        status_pagamento: StatusPagamento.Pendente,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Seed Documento
      await setDoc(doc(db, 'documentos', 'doc-carta'), {
        id_imovel: 'SaRtriImjf0vgC2cOjLI',
        tipo_doc: 'Carta de Arrematação',
        status: StatusDoc.Pendente,
        data_recebimento: '2026-06-20',
        data_vencimento: '2026-07-20',
        responsavel: 'Broker Principal',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 4. Seed CustoReforma
      await setDoc(doc(db, 'custos_reforma', 'reforma-pintura'), {
        id_imovel: 'SaRtriImjf0vgC2cOjLI',
        descricao_etapa: 'Pintura Geral e Acabamento',
        orcamento: 15000,
        valor_real: 12000,
        prazo_execucao: '15 dias',
        data_conclusao: '2026-06-25',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 5. Seed Holding
      await setDoc(doc(db, 'holding', 'holding-condo'), {
        id_imovel: 'SaRtriImjf0vgC2cOjLI',
        tipo_despesa: 'Condomínio',
        descricao: 'Taxa condominial ordinária',
        valor_mensal: 500,
        competencia: '06/2026',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Seeding completed successfully for user', uid);
    }
  } catch (error) {
    console.error('Error during seeding database:', error);
  }
};
