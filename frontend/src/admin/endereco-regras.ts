// ══════ ENDEREÇO: REGRAS PURAS ══════
// Validação e formatação usadas pela ficha (enderecos.ts), sem tocar no DOM para
// poderem ser testadas em Node. As mesmas regras são conferidas no servidor.

type EnderecoForm = {
  cep: string; logradouro: string; numero: string; complemento: string;
  bairro: string; cidade: string; uf: string;
};

const regrasEndereco = {
  UFS: ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'],
  MAX: { logradouro: 120, numero: 10, complemento: 60, bairro: 80, cidade: 80 } as Record<string, number>,

  soDigitosCep(cep: string): string {
    return String(cep || '').replace(/\D/g, '').slice(0, 8);
  },

  fmtCep(cep: string): string {
    const d = regrasEndereco.soDigitosCep(cep);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  },

  // Erros por campo (vazio = válido), com as mesmas regras do servidor.
  validar(f: EnderecoForm, consentimento: boolean): Record<string, string> {
    const erros: Record<string, string> = {};
    if (!/^[\d.\-\s]*$/.test(f.cep) || regrasEndereco.soDigitosCep(f.cep).length !== 8) erros.cep = 'Informe o CEP com 8 dígitos.';
    const obrig: [keyof EnderecoForm, string][] = [['logradouro', 'Informe a rua.'], ['numero', 'Informe o número ou "s/n".'], ['bairro', 'Informe o bairro.'], ['cidade', 'Informe a cidade.']];
    for (const [k, msg] of obrig) if (!f[k].trim()) erros[k] = msg;
    for (const [k, max] of Object.entries(regrasEndereco.MAX)) {
      if (!erros[k] && f[k as keyof EnderecoForm].trim().length > max) erros[k] = `Use no máximo ${max} caracteres.`;
    }
    if (!regrasEndereco.UFS.includes(f.uf.trim().toUpperCase())) erros.uf = 'Escolha a UF.';
    if (!consentimento) erros.consentimento = 'Marque a autorização da pessoa para salvar o endereço.';
    return erros;
  },

  // Linhas para exibir na ficha.
  linhas(e: EnderecoForm): string[] {
    const rua = [e.logradouro, e.numero].filter(Boolean).join(', ') + (e.complemento ? ` · ${e.complemento}` : '');
    return [rua, `${e.bairro} · ${e.cidade}/${e.uf}`, `CEP ${regrasEndereco.fmtCep(e.cep)}`];
  }
};
