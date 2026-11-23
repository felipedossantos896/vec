// ══════ PESSOAS: REGRAS PURAS (Spec 009) ══════
// Etiquetas de cuidado da ficha, o "há N dias" da tabela, a paginação da lista e o que
// a confirmação de exclusão avisa. Sem DOM, para serem testadas em Node.

type PessoaStatus = { contato: Date | null; lembrete: Date | null; semDiscipulador: boolean; celula: string; duplicados: number; papel?: string };

const regrasPessoas = {
  PAGINA: 50,

  dias(de: Date, agora: Date): number {
    return Math.max(0, Math.floor((agora.getTime() - de.getTime()) / 864e5));
  },

  // "hoje", "há 1 dia", "há N dias" ou "sem contato"
  haQuanto(contato: Date | null, agora: Date): string {
    if (!contato) return 'sem contato';
    const d = regrasPessoas.dias(contato, agora);
    return d < 1 ? 'hoje' : d === 1 ? 'há 1 dia' : `há ${d} dias`;
  },

  // Etiquetas do topo da ficha, na ordem de prioridade do cuidado
  etiquetas(p: PessoaStatus, agora: Date): string[] {
    const t: string[] = [];
    if (p.papel === 'lider_area') return p.duplicados > 1 ? ['Possível duplicado'] : []; // fora da trilha (Spec 013)
    if (regrasContato.semContato(p.contato, p.lembrete, agora)) t.push(p.contato ? `${regrasPessoas.dias(p.contato, agora)} dias sem contato` : 'Sem contato registrado');
    if (p.semDiscipulador) t.push('Sem discipulador');
    if (!p.celula && (!p.papel || p.papel === 'membro')) t.push('Sem célula');
    if (p.duplicados > 1) t.push('Possível duplicado');
    return t;
  },

  // Quantas linhas mostrar: a página cresce de PAGINA em PAGINA
  visiveis(total: number, limite: number): { mostra: number; resta: number } {
    const mostra = Math.min(total, Math.max(limite, 0));
    return { mostra, resta: total - mostra };
  },

  // O que acontece ao excluir, para a confirmação
  consequencias(nome: string, anotacoes: number, discipulos: number): string[] {
    const c: string[] = [];
    if (anotacoes) c.push(anotacoes === 1 ? '1 anotação de acompanhamento deixa de aparecer.' : `${anotacoes} anotações de acompanhamento deixam de aparecer.`);
    if (discipulos) c.push(discipulos === 1 ? `Quem tinha ${nome} como discipulador fica sem vínculo.` : `As ${discipulos} pessoas que tinham ${nome} como discipulador ficam sem vínculo.`);
    return c;
  },

  // Visão do discipulador (Spec 009): a primeira etapa que falta, na ordem da jornada
  proximoPasso(jornada: [string, string][], feitas: (k: string) => boolean): string {
    return (jornada.find(([k]) => !feitas(k)) || ['', ''])[1];
  },

  // "Falar agora · último contato há 48 dias" ou "Em dia · último contato há 12 dias"
  situacaoContato(contato: Date | null, lembrete: Date | null, agora: Date): { alerta: boolean; texto: string } {
    const alerta = regrasContato.semContato(contato, lembrete, agora);
    const quando = contato ? `último contato ${regrasPessoas.haQuanto(contato, agora)}` : 'nenhum contato ainda';
    return { alerta, texto: `${alerta ? 'Falar agora' : 'Em dia'} · ${quando}` };
  },

  // Quem precisa de contato primeiro; entre eles, quem está há mais tempo sem conversa
  ordemDiscipulos<T extends { alerta: boolean; contato: Date | null; nome: string }>(lista: T[]): T[] {
    const t = (x: T): number => x.contato ? x.contato.getTime() : 0;
    return [...lista].sort((a, b) => Number(b.alerta) - Number(a.alerta) || t(a) - t(b) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }
};
