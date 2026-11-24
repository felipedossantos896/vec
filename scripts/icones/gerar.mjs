// Gera frontend/src/admin/icones.ts com só os ícones do Phosphor usados no painel
// (ADR-0012). A versão do pacote é fixa no package.json (@phosphor-icons/core 2.1.1).
// Ícone novo: acrescente na lista abaixo e rode `node scripts/icones/gerar.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSAO = '2.1.1';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const SAIDA = 'frontend/src/admin/icones.ts';

// [nome no painel, nome no Phosphor, peso]
export const ICONES = [
  ['area', 'star', 'fill'],
  ['setor', 'shield-star', 'fill'],
  ['celula', 'crown-simple', 'fill'],
  ['casa', 'house-line', 'fill'],
  ['whatsapp', 'whatsapp-logo', 'bold'],
  ['ficha', 'identification-card', 'bold'],
  ['fechar', 'x', 'bold'],
  // Spec 015: os ícones antigos do painel e do formulário
  ['discipulos', 'heart', 'bold'],
  ['mapa', 'map-trifold', 'bold'],
  ['pessoas', 'users', 'bold'],
  ['indicadores', 'chart-bar', 'bold'],
  ['ajustes', 'sliders-horizontal', 'bold'],
  ['atualizar', 'arrow-clockwise', 'bold'],
  ['sair', 'sign-out', 'bold'],
  ['baixar', 'download-simple', 'bold'],
  ['buscar', 'magnifying-glass', 'bold'],
  ['mais', 'plus', 'bold'],
  ['camera', 'camera', 'bold'],
  ['feito', 'check', 'bold'],
  ['emDia', 'check-circle', 'bold'],
  ['seguir', 'arrow-right', 'bold'],
  ['abrir', 'caret-right', 'bold'],
  ['privado', 'lock-simple', 'bold'],
  // Spec 016: gaveta da Área e Voltar ao mapa
  ['voltar', 'arrow-left', 'bold'],
  ['subir', 'caret-up', 'bold']
];

export function gerar(raiz) {
  const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
  const base = path.join(raiz, 'node_modules/@phosphor-icons/core');
  const instalada = JSON.parse(fs.readFileSync(path.join(base, 'package.json'), 'utf8')).version;
  if (pkg.devDependencies['@phosphor-icons/core'] !== VERSAO || instalada !== VERSAO) throw new Error(`Phosphor precisa estar fixo em ${VERSAO}`);
  const linhas = ICONES.map(([nome, ph, peso]) => {
    const svg = fs.readFileSync(path.join(base, 'assets', peso, `${ph}${peso === 'regular' ? '' : '-' + peso}.svg`), 'utf8');
    const corpo = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
    if (!/^(<path d="[^"<>]+"\/>)+$/.test(corpo)) throw new Error(`SVG inesperado em ${ph}`);
    return `  ${nome}: '${corpo}', // ${ph} (${peso})`;
  });
  return [
    `// GERADO por scripts/icones/gerar.mjs a partir do @phosphor-icons/core ${VERSAO} (MIT,`,
    '// licença em admin/vendor/phosphor/LICENSE). Não edite à mão (ADR-0012).',
    '',
    'const ICONES_SVG: Record<string, string> = {',
    ...linhas,
    '};',
    '',
    fs.readFileSync(path.join(AQUI, 'icone.ts.txt'), 'utf8')
  ].join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const raiz = path.resolve(AQUI, '../..');
  fs.writeFileSync(path.join(raiz, SAIDA), gerar(raiz));
  console.log(`${SAIDA} gerado`);
}
