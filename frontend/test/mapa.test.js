const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Regras puras do mapa (Spec 003). Dados fictícios.
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/mapa-regras.js', 'utf8') + '\n;globalThis.regras = regrasMapa;', contexto);
const regras = contexto.regras;

const dados = () => ({
  grupos: [{ lat: -3.7305, lng: -38.5215, linhas: [1, 2, 3], peloBairro: 1 }, { lat: -3.7005, lng: -38.5005, linhas: [4], peloBairro: 0 }],
  soCidade: [5], naoLocalizados: [6], pendentes: [7]
});

test('recorta grupos e listas pelo filtro e descarta grupos vazios', () => {
  const f = regras.filtrar(dados(), new Set([1, 3, 5, 9]));
  assert.equal(f.grupos.length, 1);
  assert.deepEqual([...f.grupos[0].linhas], [1, 3]);
  assert.deepEqual([...f.soCidade], [5]);
  assert.deepEqual([...f.naoLocalizados], []);
  assert.deepEqual([...f.semEndereco], [9]);
  assert.equal(f.noMapa, 2);
});

test('sem filtro, todos os grupos e quem não tem endereço', () => {
  const f = regras.filtrar(dados(), new Set([1, 2, 3, 4, 5, 6, 7, 8]));
  assert.equal(f.grupos.length, 2);
  assert.equal(f.noMapa, 4);
  assert.deepEqual([...f.semEndereco], [8]);
});

test('resumo acima do mapa', () => {
  assert.equal(regras.resumo(regras.filtrar(dados(), new Set([1, 2, 3, 4]))), '4 pessoas no mapa, em 2 áreas.');
  assert.equal(regras.resumo(regras.filtrar(dados(), new Set([4, 7]))), '1 pessoa no mapa, em 1 área; 1 pessoa sem posição (lista abaixo).');
  assert.equal(regras.resumo(regras.filtrar(dados(), new Set())), 'Ninguém neste filtro.');
});

test('não guarda coordenada de pessoa: só centros recebidos do servidor', () => {
  const fonte = fs.readFileSync('frontend/src/admin/mapa.ts', 'utf8');
  assert.match(fonte, /tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(fonte, /OpenStreetMap<\/a> contributors/);
  assert.doesNotMatch(fonte, /localStorage|sessionStorage\.setItem/);
});

test('tamanho do rosto acompanha o zoom (Spec 012)', () => {
  assert.equal(regras.tamanhoRosto(4, false), 40);
  assert.equal(regras.tamanhoRosto(12, false), 40);
  assert.equal(regras.tamanhoRosto(14, false), 50);
  assert.equal(regras.tamanhoRosto(16, false), 60);
  assert.equal(regras.tamanhoRosto(18, false), 60);
  assert.equal(regras.tamanhoRosto(16, true), 52);
  assert.equal(regras.tamanhoRosto(13, true), 45);
});

test('selos e papéis do card (Spec 014)', () => {
  const d = (lider = [], casa = []) => ({ liderCelula: lider, casaCelula: casa });
  assert.deepEqual({ ...regras.selos({ papel: 'membro' }) }, {});
  assert.deepEqual({ ...regras.selos({ papel: 'lider_area', destaque: d([], ['Hope']) }) }, { cima: 'area', baixo: 'casa' });
  assert.deepEqual({ ...regras.selos({ papel: 'lider_setor' }) }, { cima: 'setor' });
  assert.deepEqual({ ...regras.selos({ papel: 'membro', destaque: d(['Hope'], ['Hope']) }) }, { cima: 'celula', baixo: 'casa' });
  const p = regras.papeisDoCard({ papel: 'membro', destaque: d(['Hope', 'Ashrei'], ['Hope']) });
  assert.deepEqual([...p].map(x => x.texto), ['Líder das células Hope e Ashrei', 'Anfitrião da célula Hope']);
  assert.deepEqual([...regras.papeisDoCard({ papel: 'lider_setor', setor: 'Fogo no Altar' })].map(x => x.texto), ['Líder do setor Fogo no Altar']);
  assert.deepEqual([...regras.papeisDoCard({ papel: 'lider_area' })].map(x => x.selo), ['area']);
  assert.deepEqual([...regras.papeisDoCard({})], []);
  assert.equal(regras.lista(['A', 'B', 'C']), 'A, B e C');
});

test('resumo separa membros e líderes quando há líderes no mapa (Spec 014)', () => {
  const f = regras.filtrar(dados(), new Set([1, 2, 3, 4]));
  assert.equal(regras.resumo(f, id => id === 2), '3 membros · 1 líder no mapa, em 2 áreas.');
  assert.equal(regras.resumo(f, () => false), '4 pessoas no mapa, em 2 áreas.');
});

test('subtítulo e ação do cartão (Spec 017)', () => {
  const d = (lider = [], casa = []) => ({ liderCelula: lider, casaCelula: casa });
  const sub = (p, c) => { const s = regras.subtituloCartao(p, c); return [s.texto, [...s.extras].map(x => x.texto)]; };
  assert.deepEqual(sub({ papel: 'membro' }, 'Pi-Hairote'), ['Pi-Hairote · Membro', []]);
  assert.deepEqual(sub({ papel: 'membro', destaque: d(['Hope'], ['Hope']) }, 'Hope'), ['Hope · Líder da célula', ['Anfitrião da célula Hope']]);
  assert.deepEqual(sub({ papel: 'membro', destaque: d(['Ashrei']) }, 'Hope'), ['Hope · Membro', ['Líder da célula Ashrei']]);
  assert.deepEqual(sub({ papel: 'lider_setor', setor: 'Fogo no Altar' }, ''), ['Líder do setor Fogo no Altar', []]);
  assert.deepEqual(sub({ papel: 'lider_area', destaque: d([], ['Hope']) }, ''), ['Líder de área', ['Anfitrião da célula Hope']]);
  assert.deepEqual(sub({ papel: 'membro' }, ''), ['Membro', []]);
  assert.deepEqual({ ...regras.acaoContato('https://wa.me/5585999990000') }, { tipo: 'whatsapp', rotulo: 'Entrar em contato' });
  assert.deepEqual({ ...regras.acaoContato('') }, { tipo: 'registrar', rotulo: 'Registrar contato' });
});
