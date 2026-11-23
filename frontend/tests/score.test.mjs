import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeData, previousObservation, rank, scoreDifference, signedNumber } from '../src/data.ts';

const base = { ano_mes: '202610', uf: 'RJ', sub_regiao: '20', regiao: 'Sudeste' };

test('preserva score, posição e faixa quando o segundo eixo omite os valores', () => {
  const data = normalizeData([{ ...base, score: 83.14, ranking: 1, faixa: 'Oportunidade prioritária' }],
    [{ ...base, score: null, ranking: null, faixa: null }]);
  const [row] = data.byMonth.get('202610');
  assert.equal(row.score, 83.14);
  assert.equal(row.ranking, 1);
  assert.equal(row.faixa, 'Oportunidade prioritária');
  assert.equal(rank(data.byMonth.get('202610'))[0], row);
});

test('score zero continua válido e resultado fora da escala fica ausente', () => {
  const data = normalizeData([{ ...base, score: -5, ranking: 0 }], [{ ...base, score: 0, ranking: 3 }]);
  const [row] = data.byMonth.get('202610');
  assert.equal(row.score, 0);
  assert.equal(row.ranking, 3);
  assert.equal(normalizeData([{ ...base, score: 101 }], []).byMonth.get('202610')[0].score, null);
});

test('variação mensal usa a competência anterior da base e preserva períodos sem registro', () => {
  const data = normalizeData([
    { ...base, score: 83.14 }, { ...base, ano_mes: '202608', score: 80 },
    { ...base, ano_mes: '202609', sub_regiao: '21', score: 61 },
  ], []);
  const previous = previousObservation(data, '202610', 'RJ-20');
  assert.equal(previous.period, '202609');
  assert.equal(previous.row, undefined);
  assert.equal(scoreDifference(83.14, previous.row?.score), null);
  assert.equal(signedNumber(scoreDifference(83.14, 82.30)), '+0,84');
});
