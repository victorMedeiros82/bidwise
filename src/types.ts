export enum TipoLeilao {
  Judicial = 'Judicial',
  Extrajudicial = 'Extrajudicial'
}

export enum FormaArrematacao {
  Presencial = 'Presencial',
  Online = 'Online',
  Hibrido = 'Híbrido'
}

export enum TipoImovel {
  Apartamento = 'Apartamento',
  Casa = 'Casa',
  Terreno = 'Terreno',
  SalaComercial = 'Sala Comercial',
  Galpao = 'Galpão',
  Outro = 'Outro'
}

export enum SituacaoJuridica {
  AlienacaoFiduciaria = 'Alienação Fiduciária',
  Inventario = 'Inventário',
  ExecucaoFiscal = 'Execução Fiscal',
  Penhora = 'Penhora',
  Outro = 'Outro'
}

export enum EstadoConservacao {
  Otimo = 'Ótimo',
  Bom = 'Bom',
  Regular = 'Regular',
  Ruim = 'Ruim',
  Demolido = 'Demolido'
}

export enum StatusArrematacao {
  Analise = 'Análise',
  Arrematado = 'Arrematado',
  Perdido = 'Perdido',
  Cancelado = 'Cancelado'
}

export enum StatusPagamento {
  Pago = 'Pago',
  Pendente = 'Pendente',
  Vencido = 'Vencido',
  Cancelado = 'Cancelado'
}

export enum StatusDoc {
  Pendente = 'Pendente',
  Recebido = 'Recebido',
  Protocolado = 'Protocolado',
  Registrado = 'Registrado',
  Cancelado = 'Cancelado'
}

export enum TipoFaturamento {
  Venda = 'Venda',
  Locacao = 'Locação'
}

export enum OrigemImovel {
  Leilao = 'Leilão',
  CompraDireta = 'Compra Direta',
  Outro = 'Outro'
}

export interface Leilao {
  id?: string;
  processo: string;
  comarca: string;
  tipo: TipoLeilao;
  data_leilao: string;
  link_edital?: string;
  valor_avaliacao?: number;
  valor_minimo?: number;
  forma_arrematacao?: FormaArrematacao;
  condicoes_pagamento?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy: string;
}

export interface Imovel {
  id?: string;
  id_leilao?: string;
  origem: OrigemImovel;
  matricula: string;
  cep?: string;
  endereco: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  area_m2: number;
  tipo_imovel: TipoImovel;
  situacao_juridica: SituacaoJuridica;
  estado_conservacao: EstadoConservacao;
  analise_risco?: string;
  status_arrematacao?: StatusArrematacao;
  createdAt?: any;
  updatedAt?: any;
  createdBy: string;
}

export interface CustoAquisicao {
  id?: string;
  id_imovel: string;
  tipo_custo: string;
  valor: number;
  data_vencimento?: string;
  status_pagamento: StatusPagamento;
  fileUrl?: string;
  createdAt?: any;
  createdBy: string;
}

export interface CustoReforma {
  id?: string;
  id_imovel: string;
  descricao_etapa: string;
  orcamento: number;
  valor_real?: number;
  prazo_execucao?: string;
  data_conclusao?: string;
  fileUrl?: string;
  createdAt?: any;
  createdBy: string;
}

export interface Holding {
  id?: string;
  id_imovel: string;
  tipo_despesa: string;
  valor_mensal: number;
  competencia: string;
  fileUrl?: string;
  createdAt?: any;
  createdBy: string;
}

export interface Faturamento {
  id?: string;
  id_imovel: string;
  tipo: TipoFaturamento;
  valor: number;
  data_operacao?: string;
  custo_corretagem?: number;
  createdAt?: any;
  createdBy: string;
}

export interface Documento {
  id?: string;
  id_imovel: string;
  tipo_doc: string;
  status: StatusDoc;
  data_recebimento?: string;
  data_vencimento?: string;
  responsavel?: string;
  fileUrl?: string;
  createdAt?: any;
  createdBy: string;
}
