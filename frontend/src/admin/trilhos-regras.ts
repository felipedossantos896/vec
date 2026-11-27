// ══════ TRILHOS DA JORNADA: REGRAS PURAS (Spec 027) ══════
// Os três trilhos da igreja, o estado de cada etapa e o progresso. Sem DOM, para serem
// testadas em Node. Nada é inferido: cada etapa vem de um campo já registrado no cadastro.

type EstadoEtapa = 'feito' | 'nao' | 'vazio';
type Trilho = { id: string; titulo: string; resumo: string; obrigatorio: boolean; etapas: [string, string][] };

const regrasTrilhos = {
  TRILHOS: [
    {
      id: 'membro', titulo: 'Trilho do membro', resumo: 'Caminhada do novo convertido', obrigatorio: true,
      etapas: [['recebeuJesus', 'Novo nascimento'], ['cafePastor', 'Café com o Pastor'], ['estacaoDNA', 'Estação DNA'],
        ['serveMinisterio', 'Serve em ministério'], ['celula', 'Membro de célula'], ['novaCriatura', 'Nova Criatura'],
        ['acompInicial', 'Acompanhamento Inicial'], ['batismo', 'Batismo nas Águas'], ['batismoEspirito', 'Batismo no Espírito'],
        ['encontroDeus', 'Encontro com Deus']]
    },
    { id: 'discipulador', titulo: 'Trilho do discipulador', resumo: 'Cuidar de pessoas', obrigatorio: true, etapas: [['expresso01', 'Expresso 01']] },
    {
      id: 'lider', titulo: 'Trilho do líder de célula', resumo: 'Para quem vai liderar uma célula', obrigatorio: false,
      etapas: [['expresso02', 'Expresso 02'], ['tlc', 'TLC · Treinamento de Líder de Célula'], ['tadel', 'Frequenta o TADEL']]
    }
  ] as Trilho[],

  // "Membro de célula" vem da célula informada; as demais, do Sim/Não do cadastro.
  estado(r: Record<string, unknown>, campo: string): EstadoEtapa {
    if (campo === 'celula') return r.celula ? 'feito' : 'vazio';
    return r[campo] === 'S' ? 'feito' : r[campo] === 'N' ? 'nao' : 'vazio';
  },

  progresso(r: Record<string, unknown>, t: Trilho): { feitas: number; total: number } {
    return { feitas: t.etapas.filter(([k]) => regrasTrilhos.estado(r, k) === 'feito').length, total: t.etapas.length };
  },

  // Regra já existente: o batismo pede Café com o Pastor e Nova Criatura confirmados.
  faltaParaBatismo(r: Record<string, unknown>): string[] {
    if (r.batismo === 'S') return [];
    return [...(r.cafePastor === 'S' ? [] : ['Café com o Pastor']), ...(r.novaCriatura === 'S' ? [] : ['Nova Criatura'])];
  },

  rotuloEstado(e: EstadoEtapa): string {
    return e === 'feito' ? 'Registrado' : e === 'nao' ? 'Não' : 'Não informado';
  }
};
