"use strict";
// ══════ NOVA PESSOA: REGRAS PURAS (Spec 010) ══════
// Células em que o líder pode cadastrar, a validação igual à do servidor e as mensagens
// das respostas. Sem DOM, para serem testadas em Node.
const regrasNovaPessoa = {
    // Células ativas do escopo: todas para a área; as das células e dos setores de quem lidera
    celulasPermitidas(escopo, celulas) {
        if (escopo.perfil === 'DISCIPULADOR')
            return [];
        const tem = (lista, nome) => !!nome && (lista || []).some(x => x.toLowerCase() === nome.toLowerCase());
        return celulas.filter(c => c.ativa && (escopo.todos || tem(escopo.celulas, c.nome) || tem(escopo.setores, c.setor))).map(c => c.nome);
    },
    // Só os dígitos, sem o 55 do país; '' quando vazio
    digitos(tel) {
        let d = tel.replace(/\D/g, '');
        if ((d.length === 12 || d.length === 13) && d.startsWith('55'))
            d = d.slice(2);
        return d;
    },
    // Mesmas regras do servidor: nome com 3 letras, nascimento entre 1900 e hoje, célula,
    // WhatsApp com DDD quando informado e a autorização marcada
    validar(p, hoje) {
        const e = {};
        if (p.nome.trim().length < 3)
            e.nome = 'Informe o nome completo.';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(p.nascimento) || p.nascimento < '1900-01-01' || p.nascimento > hoje)
            e.nascimento = 'Informe a data de nascimento.';
        const papel = p.papel || 'membro';
        if (papel === 'membro' && !p.celula)
            e.celula = 'Escolha a célula.';
        if (papel === 'lider_setor' && !p.setor)
            e.setor = 'Escolha o setor que ele lidera.';
        const d = regrasNovaPessoa.digitos(p.telefone);
        if (d && !((d.length === 10 || d.length === 11) && d[0] !== '0'))
            e.telefone = 'Confira o WhatsApp: DDD e número.';
        if (!p.autorizou)
            e.autorizou = 'Marque a autorização para cadastrar.';
        return e;
    },
    mensagem(erro) {
        return {
            batismo_requisitos: 'Para marcar Batismo nas Águas, confirme Café com o Pastor e Nova Criatura.',
            batismo_cafe_pastor: 'Para marcar Batismo nas Águas, falta confirmar Café com o Pastor.',
            batismo_nova_criatura: 'Para marcar Batismo nas Águas, falta confirmar Nova Criatura.',
            consentimento: 'Marque a autorização para cadastrar.',
            celula_invalida: 'Essa célula não está disponível para você. Escolha outra.',
            nome_invalido: 'Informe o nome completo.',
            nascimento_invalido: 'Confira a data de nascimento.',
            telefone_invalido: 'Confira o WhatsApp: DDD e número.',
            discipulador_invalido: 'Esse discipulador não está mais disponível. Escolha outro.',
            sem_permissao: 'Só líderes cadastram pessoas novas.',
            duplicado_fora: 'Esta pessoa já tem cadastro em outra célula. Fale com a liderança da área.',
            setor_obrigatorio: 'Escolha o setor que ele lidera.'
        }[erro] || 'Não foi possível cadastrar agora. Tente de novo.';
    }
};
