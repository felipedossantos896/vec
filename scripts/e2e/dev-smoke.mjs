// Smoke E2E opt-in contra o banco vec-dev:  npm run test:e2e:dev
//
// 1. resolve vec-dev pelo turso CLI e gera um token de 1 dia com permissões
//    mínimas (leitura geral; escrita só em usuarios/usuario_escopos/login_falhas);
// 2. cria um usuário AREA aleatório (senha em arquivo 0600 num diretório 0700);
// 3. sobe o servidor em porta livre, sem migrations automáticas;
// 4. valida o painel com Playwright em 1440x900 e 390x844;
// 5. sempre limpa: navegador, servidor, usuário e arquivos, mesmo em falha
//    ou Ctrl+C, e confere que não restou usuário temporário.
//
// Nunca imprime token, senha, dados de pessoas nem texto do console da página.
// E2E_SIMULAR_FALHA=1 força uma falha após o login para provar a limpeza.

import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { BANCO, urlDoBanco } from './banco.mjs';

const run = promisify(execFile);
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const KPIS = 5;
const PERMISSOES = [
  'all:data_read',
  'usuarios:data_add,data_update,data_delete',
  'usuario_escopos:data_add,data_delete',
  'login_falhas:data_add,data_update,data_delete',
];

const estado = { dir: null, usuario: null, servidor: null, navegador: null, env: null };
let limpeza = null;
let falhas = 0;

const ok = (msg) => console.log(`ok    ${msg}`);
const falha = (msg) => { falhas++; console.log(`FAIL  ${msg}`); };

/** Erro com mensagem segura: nunca repassa stdout/stderr de comandos. */
class Etapa extends Error {}

async function cmd(programa, args, opcoes = {}) {
  try {
    const { stdout } = await run(programa, args, { timeout: 60_000, maxBuffer: 1 << 20, ...opcoes });
    return stdout.trim();
  } catch {
    throw new Etapa(`${programa} ${args[0] ?? ''} falhou`);
  }
}

function portaLivre() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function prepararBanco() {
  const quem = await cmd('turso', ['auth', 'whoami']);
  if (quem.includes('not logged in')) throw new Etapa('turso não autenticado; rode `turso auth login`');
  const url = await cmd('turso', ['db', 'show', BANCO, '--url']);
  if (!urlDoBanco(url)) throw new Etapa(`turso não resolveu exatamente ${BANCO}; recusado`);
  const token = await cmd('turso', ['db', 'tokens', 'create', BANCO, '-e', '1d', ...PERMISSOES.flatMap(p => ['-p', p])]);
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) throw new Etapa('turso não devolveu um token válido');
  ok(`${BANCO} resolvido; token de 1 dia com permissões mínimas`);
  return { url, token };
}

async function compilar(dir) {
  await cmd('go', ['build', '-o', join(dir, 'server'), './backend/cmd/server']);
  await cmd('go', ['build', '-o', join(dir, 'e2e-usuario'), './backend/cmd/e2e-usuario']);
  ok('servidor e e2e-usuario compilados');
}

async function iniciarServidor(porta) {
  const proc = spawn(join(estado.dir, 'server'), [], { env: { ...estado.env, PORT: String(porta) }, stdio: 'ignore' });
  estado.servidor = proc;
  const base = `http://127.0.0.1:${porta}`;
  for (let i = 0; i < 100; i++) {
    if (proc.exitCode !== null) throw new Etapa('servidor encerrou ao iniciar');
    try {
      if ((await fetch(`${base}/healthz`)).ok) { ok(`servidor no ar na porta ${porta}`); return base; }
    } catch { /* ainda subindo */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Etapa('servidor não respondeu /healthz em 20s');
}

async function entrar(page, base, cred) {
  await page.goto(`${base}/admin/`);
  await page.fill('#usuario', cred.usuario);
  await page.fill('#senha', cred.senha);
  await page.click('#btnLogin');
  await page.locator('#tabIndicadores').waitFor({ state: 'visible', timeout: 20_000 });
}

async function sair(page) {
  await page.click('#btnLogout');
  await page.locator('#loginView').waitFor({ state: 'visible', timeout: 10_000 });
}

function vigiar(page, base, problemas) {
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problemas.push(`console ${m.type()}`); });
  page.on('pageerror', () => problemas.push('erro de JavaScript'));
  page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) problemas.push(`HTTP ${r.status()}`); });
}

async function validarViewport(navegador, base, cred, viewport) {
  const rotulo = `${viewport.width}x${viewport.height}`;
  const ctx = await navegador.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const problemas = [];
  vigiar(page, base, problemas);
  try {
    await entrar(page, base, cred);
    if (process.env.E2E_SIMULAR_FALHA === '1') throw new Etapa('falha simulada (E2E_SIMULAR_FALHA=1)');
    await page.click('#tabIndicadores');
    await page.locator('#indicadoresView').waitFor({ state: 'visible' });
    // Os dados chegam depois da aba: espera os KPIs (ou o estado vazio) renderizarem.
    await page.locator('#gConteudo .ui-kpi, #gConteudo .empty').first().waitFor({ state: 'visible', timeout: 20_000 });
    const kpis = await page.locator('#gConteudo .ui-kpi').count();
    kpis === KPIS ? ok(`${rotulo}: ${KPIS} KPIs`) : falha(`${rotulo}: ${kpis} KPIs, esperado ${KPIS}`);

    const opcoes = await page.locator('#gSetor option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
    if (opcoes.length) {
      await page.selectOption('#gSetor', opcoes[0]);
      const valores = await page.evaluate(() => ['gSetor', 'fSetor', 'aSetor'].map(id => document.getElementById(id).value));
      valores.every(v => v === valores[0]) ? ok(`${rotulo}: filtro de setor compartilhado entre as abas`) : falha(`${rotulo}: filtro de setor não sincronizou`);
      await page.selectOption('#gSetor', '');
    } else {
      ok(`${rotulo}: filtro de setor sem opções no escopo (verificação pulada)`);
    }

    const movimento = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    movimento ? ok(`${rotulo}: movimento reduzido ativo`) : falha(`${rotulo}: movimento reduzido não aplicado`);

    await page.locator('#tabIndicadores').focus();
    await page.keyboard.press('Tab');
    const foco = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return false;
      const s = getComputedStyle(el);
      return el.matches(':focus-visible') && (s.outlineStyle !== 'none' || s.boxShadow !== 'none');
    });
    foco ? ok(`${rotulo}: foco de teclado visível`) : falha(`${rotulo}: foco de teclado sem indicação visível`);

    const largura = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    largura <= 0 ? ok(`${rotulo}: sem overflow horizontal`) : falha(`${rotulo}: overflow horizontal de ${largura}px`);

    await sair(page);
    ok(`${rotulo}: logout`);
  } finally {
    problemas.length ? falha(`${rotulo}: ${problemas.length} problema(s): ${[...new Set(problemas)].join(', ')}`) : ok(`${rotulo}: console e HTTP sem erros`);
    await ctx.close();
  }
}

async function validarVazio(navegador, base, cred) {
  const ctx = await navegador.newContext({ viewport: VIEWPORTS[1], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  // Simula um escopo sem cadastros só na resposta de "listar"; nada é gravado.
  await page.route(`${base}/api`, async route => {
    const corpo = route.request().postDataJSON?.() ?? {};
    if (corpo.acao !== 'listar') return route.continue();
    const resposta = await route.fetch();
    const json = await resposta.json();
    await route.fulfill({ response: resposta, json: { ...json, registros: [] } });
  });
  try {
    await entrar(page, base, cred);
    await page.click('#tabIndicadores');
    const texto = await page.locator('#gConteudo .empty').textContent({ timeout: 10_000 });
    texto?.includes('Ainda não há cadastros') ? ok('estado vazio de Indicadores') : falha('estado vazio de Indicadores ausente');
    await sair(page);
  } finally {
    await ctx.close();
  }
}

function usuarioDoArquivo() {
  try {
    return JSON.parse(readFileSync(join(estado.dir, 'credencial.json'), 'utf8')).usuario ?? null;
  } catch {
    return null;
  }
}

/** Uma única limpeza, compartilhada entre o fluxo normal e os sinais. */
function limpar() {
  limpeza ??= executarLimpeza();
  return limpeza;
}

async function executarLimpeza() {
  try { await estado.navegador?.close(); } catch { /* já fechado */ }
  const srv = estado.servidor;
  if (srv && srv.exitCode === null) {
    srv.kill('SIGTERM');
    await Promise.race([new Promise(r => srv.once('exit', r)), new Promise(r => setTimeout(r, 5_000))]);
    if (srv.exitCode === null && srv.signalCode === null) srv.kill('SIGKILL');
  }
  if (estado.servidor) srv.exitCode !== null || srv.signalCode !== null ? ok('servidor encerrado') : falha('servidor ainda em execução');
  const bin = estado.dir && join(estado.dir, 'e2e-usuario');
  if (bin && existsSync(bin) && estado.env) {
    try {
      // `criar` pode gravar o usuário e ainda falhar (Ctrl+C, timeout, rede):
      // nesse caso o nome é recuperado do arquivo de credencial.
      const usuario = estado.usuario || usuarioDoArquivo();
      if (usuario) {
        await cmd(bin, ['remover', '-usuario', usuario], { env: estado.env });
        const restantes = await cmd(bin, ['contar', '-usuario', usuario], { env: estado.env });
        restantes === '0' ? ok('usuário temporário removido') : falha(`usuário temporário ainda existe no ${BANCO}`);
      }
    } catch {
      falha(`não foi possível remover o usuário temporário; remova-o com e2e-usuario remover`);
    }
  }
  if (estado.dir) {
    rmSync(estado.dir, { recursive: true, force: true });
    existsSync(estado.dir) ? falha('diretório temporário não removido') : ok('arquivos temporários removidos');
  }
}

async function principal() {
  for (const sinal of ['SIGINT', 'SIGTERM']) {
    process.once(sinal, async () => {
      console.log(`interrompido (${sinal}); limpando...`);
      falhas++;
      await limpar();
      process.exit(130);
    });
  }
  try {
    const { url, token } = await prepararBanco();
    estado.dir = mkdtempSync(join(tmpdir(), 'vec-e2e-'));
    estado.env = {
      PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR ?? tmpdir(),
      TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: token,
      ENV_FILE: join(estado.dir, 'nenhum.env'),
      SESSION_SECRET: randomBytes(32).toString('hex'),
      AUTO_MIGRATE: '0',
    };
    await compilar(estado.dir);
    const arquivo = join(estado.dir, 'credencial.json');
    estado.usuario = await cmd(join(estado.dir, 'e2e-usuario'), ['criar', '-arquivo', arquivo], { env: estado.env });
    const cred = JSON.parse(readFileSync(arquivo, 'utf8'));
    rmSync(arquivo);
    ok('usuário AREA temporário criado');
    const base = await iniciarServidor(await portaLivre());
    // O Playwright encerraria o processo no Ctrl+C antes da limpeza terminar.
    estado.navegador = await chromium.launch({ handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
    for (const viewport of VIEWPORTS) await validarViewport(estado.navegador, base, cred, viewport);
    await validarVazio(estado.navegador, base, cred);
  } catch (erro) {
    falha(erro instanceof Etapa ? erro.message : `erro inesperado (${erro?.name ?? 'Error'})`);
  } finally {
    await limpar();
  }
  console.log(falhas ? `Smoke E2E falhou: ${falhas} verificação(ões).` : 'Smoke E2E aprovado.');
  process.exitCode = falhas ? 1 : 0;
}

await principal();
