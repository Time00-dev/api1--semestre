import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeData } from '../src/data.ts';
import { matchedCity, searchTerritories, territoryName } from '../src/territorySearch.ts';

const rows = normalizeData([
  { ano_mes: '202610', uf: 'SP', sub_regiao: '12', regiao: 'Sudeste' },
  { ano_mes: '202610', uf: 'SP', sub_regiao: '13', regiao: 'Sudeste' },
  { ano_mes: '202610', uf: 'RJ', sub_regiao: '20', regiao: 'Sudeste' },
  { ano_mes: '202610', uf: 'RJ', sub_regiao: '24', regiao: 'Sudeste' },
  { ano_mes: '202610', uf: 'SC', sub_regiao: '88', regiao: 'Sul' },
], []).byMonth.get('202610');

const ids = query => searchTerritories(rows, query).map(row => row.id);

test('busca combina UF, região e CEP completo sem confundir os dígitos finais', () => {
  assert.deepEqual(ids('SP · CEP 12200-001'), ['SP-12']);
  assert.deepEqual(ids('RJ20'), ['RJ-20']);
  assert.deepEqual(ids('Santa Catarina'), ['SC-88']);
  assert.deepEqual(ids('sudeste'), ['SP-12', 'SP-13', 'RJ-20', 'RJ-24']);
});

test('busca por município reconhece acentos e associa ao prefixo publicado', () => {
  assert.deepEqual(ids('sao jose dos campos'), ['SP-12']);
  assert.deepEqual(ids('São José dos Campos RJ'), []);
  assert.equal(matchedCity(rows[0], 'São José dos Campos'), 'São José dos Campos');
  assert.deepEqual(ids('Campinas'), ['SP-13']);
});

test('rótulo respeita o nome publicado e usa referência postal ou estado quando falta', () => {
  const [niteroi] = searchTerritories(rows, 'Niterói');
  assert.equal(niteroi.id, 'RJ-24');
  assert.equal(territoryName(niteroi), 'Niterói');
  assert.equal(territoryName(niteroi, 'São Gonçalo'), 'São Gonçalo');
  assert.equal(territoryName({ ...niteroi, nome_sub_regiao: 'Nome publicado' }), 'Nome publicado');
  assert.equal(territoryName(searchTerritories(rows, 'SC 88')[0]), 'Santa Catarina');
});
