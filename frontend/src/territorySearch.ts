import type { Row } from './data';

export const states: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

// Localidades de referência para o prefixo, sem presumir seus limites.
const cities: Record<string, string[]> = {
  // IPHAN: https://www.gov.br/iphan/pt-br/acesso-a-informacao/institucional/horario-de-atendimento
  'BA-40': ['Salvador'],
  'DF-70': ['Brasília'],
  // PGFN: https://www.gov.br/pgfn/pt-br/canais_atendimento/atendimento-ao-contribuinte/santa-catarina
  'SC-88': ['Florianópolis'],
  // Correios: https://saladeimprensa.correios.com.br/arquivos/6993
  'RJ-20': ['Rio de Janeiro'],
  'RJ-21': ['Rio de Janeiro'],
  'RJ-22': ['Rio de Janeiro'],
  'RJ-23': ['Rio de Janeiro', 'Angra dos Reis'],
  'RJ-24': ['Niterói', 'São Gonçalo'],
  'RJ-25': ['Duque de Caxias', 'São João de Meriti', 'Petrópolis', 'Magé', 'Teresópolis'],
  'RJ-26': ['Nova Iguaçu', 'Belford Roxo', 'Nilópolis'],
  // https://www2.correios.com.br/institucional/licit_compras_contratos/licitacoes/anexos/EDI_CP000001_2022_133459.pdf
  'RJ-28': ['Nova Friburgo'],
  // Prefeitura de São Paulo: https://prefeitura.sp.gov.br/subprefeituras/w/calcadas/37121
  'SP-04': ['São Paulo · Vila Mariana'],
  'SP-05': ['São Paulo · Lapa'],
  // Anexo 3–SPI dos Correios.
  'SP-12': ['São José dos Campos', 'Jacareí', 'Taubaté', 'Campos do Jordão', 'Tremembé'],
  'SP-13': ['Campinas', 'Jundiaí', 'Piracicaba', 'Rio Claro', 'Sumaré', 'São João da Boa Vista'],
  'SP-14': ['Ribeirão Preto', 'Jaboticabal', 'Sertãozinho'],
  'SP-15': ['São José do Rio Preto', 'Catanduva', 'Votuporanga'],
  'SP-18': ['Sorocaba', 'Votorantim', 'São Roque', 'Tatuí'],
  'SP-19': ['Presidente Prudente'],
  'SP-11': ['São Sebastião', 'Caraguatatuba', 'Ubatuba'],
};

const words = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase().match(/[a-z]+|\d+/g) ?? [];

export function searchTerritories(rows: Row[], query: string): Row[] {
  const terms = words(query.replace(/\b(\d{5})-(\d{3})\b/g, '$1$2')).filter(term => term !== 'cep');
  if (!terms.length) return rows.slice();

  const state = terms.length === 1 && Object.hasOwn(states, terms[0].toUpperCase())
    ? terms[0].toUpperCase() : query.match(/\b[A-Z]{2}\b/g)?.find(word => Object.hasOwn(states, word));

  return rows.filter(row => {
    if (state && row.uf !== state) return false;
    const base = [row.uf, states[row.uf], row.regiao, row.name, row.uf === 'DF' ? 'Brasília' : ''].join(' ');
    const names = [base, ...(cities[row.id] ?? []).map(city => base + ' ' + city)];
    return names.some(name => {
      const tokens = words(name);
      return terms.every(term => /^\d/.test(term)
        ? row.sub_regiao.startsWith(term.slice(0, 2))
        : tokens.some(token => token.startsWith(term)));
    });
  });
}

export function matchedCity(row: Row, query: string): string | undefined {
  const terms = words(query).filter(term => term.length > 2 && term !== 'cep' && !/^\d/.test(term));
  if (!terms.length) return;
  return cities[row.id]?.find(city => {
    const tokens = words(city);
    return terms.every(term => tokens.some(token => token.startsWith(term)));
  });
}

export function territoryName(row: Row, query = ''): string {
  return row.nome_sub_regiao?.trim() || matchedCity(row, query) || cities[row.id]?.[0] || states[row.uf] || row.uf;
}

export function territoryReference(row: Row): string | undefined {
  if (!row.nome_sub_regiao?.trim() && cities[row.id]) {
    return 'Localidade de referência para este prefixo postal';
  }
}
