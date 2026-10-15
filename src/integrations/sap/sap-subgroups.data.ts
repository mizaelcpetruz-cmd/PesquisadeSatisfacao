export interface SapSubgroup {
  Code: string;
  Name: string;
  Group?: string;
  groupCode: string;
  groupName: string;
  subgroup: string;
}

/**
 * Baseline catalog of SAP Groups and Subgroups extracted directly from @CSG_LINHA (UDO CSG_CADSUBG)
 */
export const STATIC_SUBGROUPS: SapSubgroup[] = [
  // 102 - FOOD SERVICE (com BARANO)
  {
    Code: "102:BARANO",
    Name: "BARANO",
    Group: "FOOD SERVICE",
    groupCode: "102",
    groupName: "FOOD SERVICE",
    subgroup: "BARANO",
  },
  {
    Code: "102:BELA ISCHIA",
    Name: "BELA ISCHIA",
    Group: "FOOD SERVICE",
    groupCode: "102",
    groupName: "FOOD SERVICE",
    subgroup: "BELA ISCHIA",
  },
  {
    Code: "102:DISTRIBUIDOR",
    Name: "DISTRIBUIDOR",
    Group: "FOOD SERVICE",
    groupCode: "102",
    groupName: "FOOD SERVICE",
    subgroup: "DISTRIBUIDOR",
  },
  {
    Code: "102:RESTAURANTES",
    Name: "RESTAURANTES",
    Group: "FOOD SERVICE",
    groupCode: "102",
    groupName: "FOOD SERVICE",
    subgroup: "RESTAURANTES",
  },
  {
    Code: "102:ARTESANAL",
    Name: "ARTESANAL",
    Group: "FOOD SERVICE",
    groupCode: "102",
    groupName: "FOOD SERVICE",
    subgroup: "ARTESANAL",
  },
  {
    Code: "102:LANCHONETES",
    Name: "LANCHONETES",
    Group: "FOOD SERVICE",
    groupCode: "102",
    groupName: "FOOD SERVICE",
    subgroup: "LANCHONETES",
  },
  {
    Code: "102:",
    Name: "(Sem Subgrupo)",
    Group: "FOOD SERVICE",
    groupCode: "102",
    groupName: "FOOD SERVICE",
    subgroup: "(Sem Subgrupo)",
  },

  // 100 - AUTO SERVICO
  {
    Code: "100:VAREJISTA",
    Name: "VAREJISTA",
    Group: "AUTO SERVICO",
    groupCode: "100",
    groupName: "AUTO SERVICO",
    subgroup: "VAREJISTA",
  },
  {
    Code: "100:CENTRAL DO AÇAI",
    Name: "CENTRAL DO AÇAI",
    Group: "AUTO SERVICO",
    groupCode: "100",
    groupName: "AUTO SERVICO",
    subgroup: "CENTRAL DO AÇAI",
  },
  {
    Code: "100:ATACADISTA",
    Name: "ATACADISTA",
    Group: "AUTO SERVICO",
    groupCode: "100",
    groupName: "AUTO SERVICO",
    subgroup: "ATACADISTA",
  },
  {
    Code: "100:",
    Name: "(Sem Subgrupo)",
    Group: "AUTO SERVICO",
    groupCode: "100",
    groupName: "AUTO SERVICO",
    subgroup: "(Sem Subgrupo)",
  },

  // 103 - INDUSTRIA
  {
    Code: "103:INGREDIENTES",
    Name: "INGREDIENTES",
    Group: "INDUSTRIA",
    groupCode: "103",
    groupName: "INDUSTRIA",
    subgroup: "INGREDIENTES",
  },
  {
    Code: "103:",
    Name: "(Sem Subgrupo)",
    Group: "INDUSTRIA",
    groupCode: "103",
    groupName: "INDUSTRIA",
    subgroup: "(Sem Subgrupo)",
  },

  // 111 - MATERIAL DE CONSUMO
  {
    Code: "111:OUTROS",
    Name: "OUTROS",
    Group: "MATERIAL DE CONSUMO",
    groupCode: "111",
    groupName: "MATERIAL DE CONSUMO",
    subgroup: "OUTROS",
  },
  {
    Code: "111:MATERIAL DE LIMPEZA",
    Name: "MATERIAL DE LIMPEZA",
    Group: "MATERIAL DE CONSUMO",
    groupCode: "111",
    groupName: "MATERIAL DE CONSUMO",
    subgroup: "MATERIAL DE LIMPEZA",
  },
  {
    Code: "111:MATERIAL DE CONSTRUCAO",
    Name: "MATERIAL DE CONSTRUCAO",
    Group: "MATERIAL DE CONSUMO",
    groupCode: "111",
    groupName: "MATERIAL DE CONSUMO",
    subgroup: "MATERIAL DE CONSTRUCAO",
  },
  {
    Code: "111:MATERIAL DE EXPEDIENTE",
    Name: "MATERIAL DE EXPEDIENTE",
    Group: "MATERIAL DE CONSUMO",
    groupCode: "111",
    groupName: "MATERIAL DE CONSUMO",
    subgroup: "MATERIAL DE EXPEDIENTE",
  },
  {
    Code: "111:MATERIAL DE LABORATORIO",
    Name: "MATERIAL DE LABORATORIO",
    Group: "MATERIAL DE CONSUMO",
    groupCode: "111",
    groupName: "MATERIAL DE CONSUMO",
    subgroup: "MATERIAL DE LABORATORIO",
  },
  {
    Code: "111:MATERIAL DE MANUTENCAO",
    Name: "MATERIAL DE MANUTENCAO",
    Group: "MATERIAL DE CONSUMO",
    groupCode: "111",
    groupName: "MATERIAL DE CONSUMO",
    subgroup: "MATERIAL DE MANUTENCAO",
  },
  {
    Code: "111:ALIMENTOS",
    Name: "ALIMENTOS",
    Group: "MATERIAL DE CONSUMO",
    groupCode: "111",
    groupName: "MATERIAL DE CONSUMO",
    subgroup: "ALIMENTOS",
  },
  {
    Code: "111:MATERIAL MARKETING",
    Name: "MATERIAL MARKETING",
    Group: "MATERIAL DE CONSUMO",
    groupCode: "111",
    groupName: "MATERIAL DE CONSUMO",
    subgroup: "MATERIAL MARKETING",
  },
  {
    Code: "111:",
    Name: "(Sem Subgrupo)",
    Group: "MATERIAL DE CONSUMO",
    groupCode: "111",
    groupName: "MATERIAL DE CONSUMO",
    subgroup: "(Sem Subgrupo)",
  },

  // 110 - PRESTADORES DE SERVIÇO
  {
    Code: "110:TRANSPORTE",
    Name: "TRANSPORTE",
    Group: "PRESTADORES DE SERVIÇO",
    groupCode: "110",
    groupName: "PRESTADORES DE SERVIÇO",
    subgroup: "TRANSPORTE",
  },
  {
    Code: "110:OUTROS",
    Name: "OUTROS",
    Group: "PRESTADORES DE SERVIÇO",
    groupCode: "110",
    groupName: "PRESTADORES DE SERVIÇO",
    subgroup: "OUTROS",
  },
  {
    Code: "110:CONSULTORIA",
    Name: "CONSULTORIA",
    Group: "PRESTADORES DE SERVIÇO",
    groupCode: "110",
    groupName: "PRESTADORES DE SERVIÇO",
    subgroup: "CONSULTORIA",
  },
  {
    Code: "110:MANUTENÇÃO DE VEICULOS",
    Name: "MANUTENÇÃO DE VEICULOS",
    Group: "PRESTADORES DE SERVIÇO",
    groupCode: "110",
    groupName: "PRESTADORES DE SERVIÇO",
    subgroup: "MANUTENÇÃO DE VEICULOS",
  },
  {
    Code: "110:MANUTENÇÃO PREDIAL",
    Name: "MANUTENÇÃO PREDIAL",
    Group: "PRESTADORES DE SERVIÇO",
    groupCode: "110",
    groupName: "PRESTADORES DE SERVIÇO",
    subgroup: "MANUTENÇÃO PREDIAL",
  },
  {
    Code: "110:MANUTENÇÃO INDUSTRIAL",
    Name: "MANUTENÇÃO INDUSTRIAL",
    Group: "PRESTADORES DE SERVIÇO",
    groupCode: "110",
    groupName: "PRESTADORES DE SERVIÇO",
    subgroup: "MANUTENÇÃO INDUSTRIAL",
  },
  {
    Code: "110:UTILIDADES(TELEF,ENERG,INTER)",
    Name: "UTILIDADES(TELEF,ENERG,INTER)",
    Group: "PRESTADORES DE SERVIÇO",
    groupCode: "110",
    groupName: "PRESTADORES DE SERVIÇO",
    subgroup: "UTILIDADES(TELEF,ENERG,INTER)",
  },
  {
    Code: "110:DESPACHANTE ADUANEIRO",
    Name: "DESPACHANTE ADUANEIRO",
    Group: "PRESTADORES DE SERVIÇO",
    groupCode: "110",
    groupName: "PRESTADORES DE SERVIÇO",
    subgroup: "DESPACHANTE ADUANEIRO",
  },
  {
    Code: "110:CERTIFICAÇÃO",
    Name: "CERTIFICAÇÃO",
    Group: "PRESTADORES DE SERVIÇO",
    groupCode: "110",
    groupName: "PRESTADORES DE SERVIÇO",
    subgroup: "CERTIFICAÇÃO",
  },
  {
    Code: "110:",
    Name: "(Sem Subgrupo)",
    Group: "PRESTADORES DE SERVIÇO",
    groupCode: "110",
    groupName: "PRESTADORES DE SERVIÇO",
    subgroup: "(Sem Subgrupo)",
  },

  // 112 - COMBUST E LUBRIFIC
  {
    Code: "112:COMBUST E LUBRIFIC",
    Name: "COMBUST E LUBRIFIC",
    Group: "COMBUST E LUBRIFIC",
    groupCode: "112",
    groupName: "COMBUST E LUBRIFIC",
    subgroup: "COMBUST E LUBRIFIC",
  },
  {
    Code: "112:",
    Name: "(Sem Subgrupo)",
    Group: "COMBUST E LUBRIFIC",
    groupCode: "112",
    groupName: "COMBUST E LUBRIFIC",
    subgroup: "(Sem Subgrupo)",
  },

  // 107 - PARCEIROS NEGOCIOS
  {
    Code: "107:FORNECEDORES",
    Name: "FORNECEDORES",
    Group: "PARCEIROS NEGOCIOS",
    groupCode: "107",
    groupName: "PARCEIROS NEGOCIOS",
    subgroup: "FORNECEDORES",
  },
  {
    Code: "107:SOCIOS",
    Name: "SOCIOS",
    Group: "PARCEIROS NEGOCIOS",
    groupCode: "107",
    groupName: "PARCEIROS NEGOCIOS",
    subgroup: "SOCIOS",
  },
  {
    Code: "107:INTERCOMPANY",
    Name: "INTERCOMPANY",
    Group: "PARCEIROS NEGOCIOS",
    groupCode: "107",
    groupName: "PARCEIROS NEGOCIOS",
    subgroup: "INTERCOMPANY",
  },
  {
    Code: "107:",
    Name: "(Sem Subgrupo)",
    Group: "PARCEIROS NEGOCIOS",
    groupCode: "107",
    groupName: "PARCEIROS NEGOCIOS",
    subgroup: "(Sem Subgrupo)",
  },

  // 105 - COPACKER
  {
    Code: "105:COPACKER",
    Name: "COPACKER",
    Group: "COPACKER",
    groupCode: "105",
    groupName: "COPACKER",
    subgroup: "COPACKER",
  },
  {
    Code: "105:",
    Name: "(Sem Subgrupo)",
    Group: "COPACKER",
    groupCode: "105",
    groupName: "COPACKER",
    subgroup: "(Sem Subgrupo)",
  },

  // 121 - MATÉRIA PRIMA
  {
    Code: "121:AÇAÍ",
    Name: "AÇAÍ",
    Group: "MATÉRIA PRIMA",
    groupCode: "121",
    groupName: "MATÉRIA PRIMA",
    subgroup: "AÇAÍ",
  },
  {
    Code: "121:DEMAIS FRUTOS",
    Name: "DEMAIS FRUTOS",
    Group: "MATÉRIA PRIMA",
    groupCode: "121",
    groupName: "MATÉRIA PRIMA",
    subgroup: "DEMAIS FRUTOS",
  },
  {
    Code: "121:",
    Name: "(Sem Subgrupo)",
    Group: "MATÉRIA PRIMA",
    groupCode: "121",
    groupName: "MATÉRIA PRIMA",
    subgroup: "(Sem Subgrupo)",
  },

  // 101 - FORNECEDORES
  {
    Code: "101:AÇAI",
    Name: "AÇAI",
    Group: "FORNECEDORES",
    groupCode: "101",
    groupName: "FORNECEDORES",
    subgroup: "AÇAI",
  },
  {
    Code: "101:",
    Name: "(Sem Subgrupo)",
    Group: "FORNECEDORES",
    groupCode: "101",
    groupName: "FORNECEDORES",
    subgroup: "(Sem Subgrupo)",
  },
];
