// ══════ NOME CURTO DOS MEMBROS (Spec 011) ══════
// Primeiro nome e último sobrenome nas listas; o nome completo fica no cadastro e na ficha.
// Sem DOM, para ser testado em Node. Só exibição: o nome gravado nunca muda.

const regrasNomes = {
  PARTICULAS: new Set(['de', 'da', 'do', 'das', 'dos', 'e']),
  SUFIXOS: new Set(['filho', 'filha', 'junior', 'jr', 'neto', 'neta', 'sobrinho', 'sobrinha']),
  // Segundos nomes que formam nome composto. Ficam de fora os que também são sobrenomes
  // comuns (Rosa, Cruz, Vitória…) e Maria/Rita, usados como nome do meio (Spec 011).
  COMPOSTOS: new Set([
    'clara', 'eduarda', 'luiza', 'luisa', 'julia', 'beatriz', 'cecilia', 'alice', 'laura', 'gabriela', 'fernanda',
    'paula', 'carolina', 'helena', 'sofia', 'sophia', 'isabel', 'isabela', 'isabella', 'leticia', 'cristina',
    'aparecida', 'lucia', 'regina', 'antonia', 'valentina', 'heloisa', 'clarice', 'teresa', 'tereza', 'elisa',
    'livia', 'lara', 'giovanna', 'luana', 'mariana', 'pedro', 'paulo', 'arthur', 'artur', 'henrique',
    'gabriel', 'lucas', 'miguel', 'vitor', 'victor', 'guilherme', 'carlos', 'felipe', 'eduardo', 'antonio', 'jose',
    'marcos', 'rafael', 'augusto', 'roberto', 'ricardo', 'luis', 'luiz', 'otavio', 'davi', 'gustavo', 'matheus',
    'mateus', 'francisco', 'fernando', 'cesar', 'emanuel', 'samuel', 'daniel', 'andre', 'alexandre', 'claudio',
    'sergio', 'fabio', 'mario', 'vinicius', 'leonardo', 'rodrigo'
  ]),

  // Sem acento e em minúsculas, para comparar
  chave(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\.$/, '');
  },

  // Cada palavra com maiúscula inicial; partículas em minúscula
  palavras(nome: string): string[] {
    return nome.trim().split(/\s+/).filter(Boolean).map((p, i) => {
      const baixa = p.toLocaleLowerCase('pt-BR');
      if (i > 0 && regrasNomes.PARTICULAS.has(baixa)) return baixa;
      return baixa.replace(/(^|[-'])(\p{L})/gu, (_m, s: string, l: string) => s + l.toLocaleUpperCase('pt-BR'));
    });
  },

  completo(nome: string): string {
    return regrasNomes.palavras(nome).join(' ');
  },

  // Partes do nome: o primeiro, o composto (se houver), os do meio e o sobrenome escolhido
  partes(nome: string): { primeiro: string; composto: string; meio: string[]; sobrenome: string; resto: string } {
    const t = regrasNomes.palavras(nome);
    const vazio = { primeiro: t[0] || '', composto: '', meio: [] as string[], sobrenome: '', resto: '' };
    if (t.length <= 1) return vazio;
    const part = (p: string): boolean => regrasNomes.PARTICULAS.has(regrasNomes.chave(p));
    let resto = t.slice(1);
    let composto = '';
    if (t.length > 2 && regrasNomes.COMPOSTOS.has(regrasNomes.chave(t[1]))) { composto = t[1]; resto = t.slice(2); }
    while (resto.length && regrasNomes.SUFIXOS.has(regrasNomes.chave(resto[resto.length - 1]))) resto = resto.slice(0, -1);
    while (resto.length && part(resto[resto.length - 1])) resto = resto.slice(0, -1);
    if (!resto.length) return { ...vazio, composto };
    const ult = resto.length - 1;
    // Partícula antes do último sobrenome: vale o sobrenome anterior (se houver)
    let i = ult;
    if (ult >= 1 && part(resto[ult - 1])) {
      let j = ult - 2;
      while (j >= 0 && part(resto[j])) j--;
      if (j < 0) return { ...vazio, composto, sobrenome: '', resto: resto.join(' ') };
      i = j;
    }
    return { primeiro: t[0], composto, meio: resto.slice(0, i).filter(p => !part(p)), sobrenome: resto[i], resto: '' };
  },

  // A regra da Spec 011
  curto(nome: string): string {
    const t = regrasNomes.palavras(nome);
    if (t.length <= 2) return t.join(' ');
    const p = regrasNomes.partes(nome);
    if (p.composto) return `${p.primeiro} ${p.composto}`;
    if (p.resto) return `${p.primeiro} ${p.resto}`; // "Ana de Paula"
    return p.sobrenome ? `${p.primeiro} ${p.sobrenome}` : p.primeiro;
  },

  // Nome de exibição de cada pessoa, sem dois iguais: iniciais do meio (ou o sobrenome, no
  // composto) só para quem repete; se ainda empatar, o nome completo.
  semColisao(pessoas: { id: number; nome: string }[]): Map<number, string> {
    const out = new Map<number, string>();
    const grupos = new Map<string, { id: number; nome: string }[]>();
    pessoas.forEach(p => {
      const c = regrasNomes.curto(p.nome);
      out.set(p.id, c);
      const k = regrasNomes.chave(c);
      grupos.set(k, [...(grupos.get(k) || []), p]);
    });
    grupos.forEach(g => {
      const nomes = new Set(g.map(p => regrasNomes.chave(regrasNomes.completo(p.nome))));
      if (g.length < 2 || nomes.size < 2) return; // a mesma pessoa repetida não conta
      const segundo = new Map<number, string>();
      g.forEach(p => {
        const x = regrasNomes.partes(p.nome);
        let v = out.get(p.id) || '';
        if (x.composto) { const s = regrasNomes.partes(`${x.primeiro} ${regrasNomes.palavras(p.nome).slice(2).join(' ')}`).sobrenome; if (s) v = `${x.primeiro} ${x.composto} ${s}`; }
        else if (x.meio.length && x.sobrenome) v = `${x.primeiro} ${x.meio.map(m => m[0] + '.').join(' ')} ${x.sobrenome}`;
        segundo.set(p.id, v);
      });
      const cont = new Map<string, number>();
      segundo.forEach(v => cont.set(regrasNomes.chave(v), (cont.get(regrasNomes.chave(v)) || 0) + 1));
      g.forEach(p => {
        const v = segundo.get(p.id) || '';
        out.set(p.id, (cont.get(regrasNomes.chave(v)) || 0) > 1 ? regrasNomes.completo(p.nome) : v);
      });
    });
    return out;
  }
};
