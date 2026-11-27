// ══════ ESTADOS DE TELA (Spec 009) ══════
// O mesmo bloco para vazio, tudo em dia, busca sem resultado, sem conexão, erro, sessão,
// sem permissão e mapa vazio: ícone, título, texto curto e uma ação. Sem DOM, para ser
// testado em Node; a ação é um botão com atributos data-* tratados por quem desenha.

type EstadoTela = {
  tipo: 'ok' | 'vazio' | 'busca' | 'offline' | 'erro' | 'sessao' | 'permissao' | 'mapa';
  titulo: string;
  texto: string;
  acao?: { rotulo: string; attr: string; primaria?: boolean };
};

const regrasEstados = {
  ICONES: { ok: '✓', vazio: '○', busca: '⌕', offline: '⌁', erro: '!', sessao: '⏱', permissao: '🔒', mapa: '⌖' } as Record<string, string>,

  esc(s: string): string {
    return s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  },

  html(e: EstadoTela): string {
    const x = regrasEstados.esc;
    const papel = e.tipo === 'erro' || e.tipo === 'offline' ? 'alert' : 'status';
    return `<div class="estado ${e.tipo}" role="${papel}"><span class="estado-ic" aria-hidden="true">${regrasEstados.ICONES[e.tipo] || ''}</span>` +
      `<p class="estado-t">${x(e.titulo)}</p><p class="estado-x">${x(e.texto)}</p>` +
      (e.acao ? `<button type="button" class="${e.acao.primaria ? 'b-pri' : 'b-sec'}" ${e.acao.attr}>${x(e.acao.rotulo)}</button>` : '') + '</div>';
  },

  // Linhas cinzas no lugar da lista enquanto os dados chegam
  carregando(texto: string, linhas = 4): string {
    return `<div class="esqueleto" role="status" aria-live="polite">${'<div class="esq-l" aria-hidden="true"><i></i><span><b></b><b></b></span><em></em></div>'.repeat(linhas)}<p>${regrasEstados.esc(texto)}</p></div>`;
  },

  // Lista de pessoas sem ninguém: sem cadastros, busca sem resultado ou filtros demais
  listaVazia(total: number, busca: string, outrosFiltros: boolean): EstadoTela {
    if (!total) return { tipo: 'vazio', titulo: 'Ainda não há cadastros', texto: 'Assim que alguém enviar o formulário, a pessoa aparece aqui.' };
    if (busca) return { tipo: 'busca', titulo: `Ninguém com “${busca}”`, texto: 'Confira a grafia ou procure pelo sobrenome. A busca vale só para o seu escopo.', acao: { rotulo: 'Limpar busca', attr: 'data-limpar="busca"' } };
    return { tipo: 'busca', titulo: 'Ninguém com esses filtros', texto: outrosFiltros ? 'Tire um filtro para ver mais pessoas.' : 'Tente outra combinação.', acao: { rotulo: 'Limpar filtros', attr: 'data-limpar="tudo"' } };
  },

  cuidadoEmDia(onde: string): EstadoTela {
    return { tipo: 'ok', titulo: 'Ninguém precisa de cuidado agora', texto: `Todas as pessoas ${onde} estão em dia com o cuidado. Bom trabalho!`, acao: { rotulo: 'Ver todas as pessoas', attr: 'data-ir="cadastros"' } };
  },

  falhaCarga(online: boolean): EstadoTela {
    return online
      ? { tipo: 'erro', titulo: 'Não foi possível carregar', texto: 'Tente de novo em instantes. Se continuar, avise a liderança da área.', acao: { rotulo: 'Tentar de novo', attr: 'data-recarregar', primaria: true } }
      : { tipo: 'offline', titulo: 'Sem internet agora', texto: 'Quando a conexão voltar, use Tentar de novo.', acao: { rotulo: 'Tentar de novo', attr: 'data-recarregar', primaria: true } };
  },

  mapaVazio(): EstadoTela {
    return { tipo: 'mapa', titulo: 'O mapa ainda está vazio', texto: 'Cadastre endereços na ficha das pessoas para vê-las aqui.', acao: { rotulo: 'Ver quem não tem endereço', attr: 'data-ver-lista' } };
  }
};
