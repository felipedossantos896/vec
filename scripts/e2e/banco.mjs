// Confere a URL devolvida por `turso db show vec-dev --url` antes de usá-la.
// Turso monta o host como <banco>-<organização>.<região>.turso.io; como nomes
// podem ter hífen, isto garante o prefixo "vec-dev-" e o domínio da Turso, não
// distingue um banco "vec-dev-x" (o nome já é resolvido exatamente pelo CLI).
export const BANCO = 'vec-dev';

export function urlDoBanco(url, banco = BANCO) {
  const m = /^libsql:\/\/([a-z0-9-]+)((?:\.[a-z0-9-]+)*\.turso\.io)$/.exec(String(url).trim());
  return Boolean(m && m[1].startsWith(`${banco}-`) && m[1].length > banco.length + 1);
}
