// ══════ CONTATO: REGRAS PURAS (Spec 009) ══════
// Tipos de contato, datas (hoje, ontem, outro dia), o lembrete de falar de novo e a regra
// de quem precisa de cuidado. Sem DOM, para serem testadas em Node. Datas em AAAA-MM-DD.

type FormContato = { tipo: string; quando: string; outroDia: string; texto: string; lembrarDias: number };

const regrasContato = {
  TIPOS: [['ligacao', 'Ligação', '☎'], ['whatsapp', 'WhatsApp', '✆'], ['visita', 'Visita', '⌂'], ['encontro', 'Encontro', '☕'], ['nota', 'Anotação', '✎']] as [string, string, string][],
  LEMBRETES: [[15, 'Em 15 dias'], [30, 'Em 30 dias'], [60, 'Em 60 dias'], [90, 'Em 90 dias'], [0, 'Sem lembrete']] as [number, string][],
  LEMBRETE_PADRAO: 30, // decisão 3 da Spec 009
  DIAS_SEM_CONTATO: 60,

  iso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  somarDias(base: Date, dias: number): Date {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setDate(d.getDate() + dias);
    return d;
  },

  // Dia do contato: hoje, ontem ou o informado.
  dataDoContato(f: FormContato, agora: Date): string {
    if (f.quando === 'ontem') return regrasContato.iso(regrasContato.somarDias(agora, -1));
    if (f.quando === 'outro') return f.outroDia;
    return regrasContato.iso(agora);
  },

  // Lembrete contado a partir de hoje (é quando o líder volta a se preocupar); 0 = sem.
  lembrete(dias: number, agora: Date): string {
    return dias > 0 ? regrasContato.iso(regrasContato.somarDias(agora, dias)) : '';
  },

  // Erros por campo, com as mesmas regras do servidor.
  validar(f: FormContato, agora: Date): Record<string, string> {
    const e: Record<string, string> = {};
    if (!regrasContato.TIPOS.some(([k]) => k === f.tipo)) e.tipo = 'Escolha como foi o contato.';
    if (f.tipo === 'nota' && !f.texto.trim()) e.texto = 'Escreva a anotação.';
    if (f.quando === 'outro') {
      const hoje = regrasContato.iso(agora), limite = regrasContato.iso(regrasContato.somarDias(agora, -366));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.outroDia) || f.outroDia > hoje || f.outroDia < limite) e.outroDia = 'Escolha um dia de até um ano atrás, sem ser no futuro.';
    }
    return e;
  },

  // Precisa de cuidado por falta de contato: nunca falou; o lembrete venceu; ou, sem
  // lembrete, passou do limite de dias.
  semContato(ultimo: Date | null, lembrete: Date | null, agora: Date): boolean {
    if (!ultimo) return true;
    if (lembrete) return agora.getTime() >= lembrete.getTime();
    return agora.getTime() - ultimo.getTime() > regrasContato.DIAS_SEM_CONTATO * 864e5;
  },

  rotulo(tipo: string): string {
    return (regrasContato.TIPOS.find(([k]) => k === tipo) || regrasContato.TIPOS[4])[1];
  },
  icone(tipo: string): string {
    return (regrasContato.TIPOS.find(([k]) => k === tipo) || regrasContato.TIPOS[4])[2];
  },
  // "21/11" a partir de AAAA-MM-DD.
  diaMes(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${m[3]}/${m[2]}` : '';
  }
};
