import type { Row } from './data';

const states: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal Brasília', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

// Prefixos de localidades consultadas no Anexo 3–SPI dos Correios.
const cities: Record<string, string[]> = {
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
    const base = [row.uf, states[row.uf], row.regiao, row.name].join(' ');
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
