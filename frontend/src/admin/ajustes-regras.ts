// ══════ AJUSTES: REGRAS PURAS (Spec 009) ══════
// Último acesso em linguagem de gente, o perfil explicado e o escopo em poucas palavras.
// Sem DOM, para serem testadas em Node.

type UsuarioResumo = { perfil: string; setores: string[]; celulas: string[]; cadastro: number };

const regrasAjustes = {
  PERFIS: [
    ['AREA', 'Área', 'vê tudo'],
    ['SETOR', 'Setor', 'setores escolhidos'],
    ['CELULA', 'Célula', 'células escolhidas'],
    ['DISCIPULADOR', 'Discipulador', 'só os discípulos']
  ] as [string, string, string][],

  // "agora", "há 15 min", "há 2 h", "ontem", "há 3 dias", "12/08/2026" ou "nunca"
  acesso(iso: string, agora: Date): string {
    const d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return 'nunca';
    const min = Math.floor((agora.getTime() - d.getTime()) / 60000);
    if (min < 5) return 'agora';
    if (min < 60) return `há ${min} min`;
    const dia = (x: Date): number => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dias = Math.round((dia(agora) - dia(d)) / 864e5);
    if (dias === 0) return `há ${Math.floor(min / 60)} h`;
    if (dias === 1) return 'ontem';
    if (dias < 30) return `há ${dias} dias`;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  },

  rotuloPerfil(p: string): string {
    return (regrasAjustes.PERFIS.find(([k]) => k === p) || ['', 'Sem perfil'])[1];
  },

  // "Toda a área", "Fogo no Altar", "Ashrei e Hope", "Ashrei +2", "6 discípulos"
  escopo(u: UsuarioResumo, discipulos: number): string {
    if (u.perfil === 'AREA') return 'Toda a área';
    if (u.perfil === 'DISCIPULADOR') return discipulos === 1 ? '1 discípulo' : `${discipulos} discípulos`;
    const nomes = [...u.setores, ...u.celulas];
    if (!nomes.length) return 'Acesso não configurado';
    return nomes.length <= 2 ? nomes.join(' e ') : `${nomes[0]} +${nomes.length - 1}`;
  }
};
