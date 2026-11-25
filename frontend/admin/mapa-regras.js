"use strict";
// ══════ MAPA: REGRAS PURAS ══════
// Recorte dos dados do mapa pelo filtro atual, sem tocar no DOM nem no Leaflet,
// para poder ser testado em Node. Os pontos confirmados têm a marca exato.
const regrasMapa = {
    LEQUE_CIRCULO: 8, // até 8 rostos em círculo; acima disso, espiral (Spec 012)
    // Posições do leque em pixels, em volta do centro da área (só visual: nenhuma posição real).
    // Círculo começando no alto, com folga entre os rostos; acima de 8, espiral de Arquimedes.
    leque(n, rosto) {
        if (n <= 1)
            return n === 1 ? [{ x: 0, y: -Math.round(rosto * 1.2) }] : [];
        const passo = rosto + 8; // distância entre centros vizinhos
        if (n <= regrasMapa.LEQUE_CIRCULO) {
            const r = Math.max(rosto * 1.2, passo / (2 * Math.sin(Math.PI / n)));
            return Array.from({ length: n }, (_, i) => {
                const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
                return { x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
            });
        }
        const out = [];
        let a = -Math.PI / 2, r = rosto * 1.3;
        const abre = (passo * 1.05) / (2 * Math.PI); // a espiral cresce uma "fileira" a cada volta
        for (let i = 0; i < n; i++) {
            out.push({ x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) });
            const da = passo / r;
            a += da;
            r += abre * da;
        }
        return out;
    },
    // Tamanho do rosto no mapa (Spec 012): 40 px com o mapa afastado (zoom 12 ou menos) até
    // 60 px de perto (zoom 16); no celular, no máximo 52 px.
    tamanhoRosto(zoom, celular) {
        const t = Math.round(40 + Math.min(Math.max(zoom - 12, 0), 4) * 5);
        return celular ? Math.min(t, 52) : t;
    },
    // Mantém só quem está no filtro de setor/célula; grupos que ficam vazios somem.
    filtrar(d, visiveis) {
        const so = (ids) => ids.filter(id => visiveis.has(id));
        const grupos = d.grupos.map(g => ({ ...g, linhas: so(g.linhas) })).filter(g => g.linhas.length > 0);
        const comEndereco = new Set([...d.grupos.flatMap(g => g.linhas), ...d.soCidade, ...d.naoLocalizados, ...d.pendentes]);
        return {
            grupos,
            soCidade: so(d.soCidade),
            naoLocalizados: so(d.naoLocalizados),
            pendentes: so(d.pendentes),
            semEndereco: [...visiveis].filter(id => !comEndereco.has(id)).sort((a, b) => a - b),
            noMapa: grupos.reduce((n, g) => n + g.linhas.length, 0)
        };
    },
    // Selos do rosto (Spec 014): liderança no canto de cima (área > setor > célula) e a casa
    // da célula no de baixo. Até dois por rosto.
    selos(p) {
        const d = p.destaque;
        const cima = p.papel === 'lider_area' ? 'area' : p.papel === 'lider_setor' ? 'setor' : d && d.liderCelula.length ? 'celula' : undefined;
        return { ...(cima ? { cima } : {}), ...(d && d.casaCelula.length ? { baixo: 'casa' } : {}) };
    },
    NOME_SELO: { area: 'Líder de área', setor: 'Líder de setor', celula: 'Líder de célula', casa: 'Casa da célula' },
    // "Hope", "Hope e Ashrei", "Hope, Ashrei e Betânia"
    lista(nomes) {
        return nomes.length < 2 ? (nomes[0] || '') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
    },
    // Papéis do card, na ordem dos selos: liderança da área ou do setor, das células e a casa
    papeisDoCard(p) {
        const out = [];
        const d = p.destaque || { liderCelula: [], casaCelula: [] };
        const cel = (n) => `${n.length > 1 ? 'das células' : 'da célula'} ${regrasMapa.lista(n)}`;
        if (p.papel === 'lider_area')
            out.push({ selo: 'area', texto: 'Líder de área' });
        if (p.papel === 'lider_setor')
            out.push({ selo: 'setor', texto: p.setor ? `Líder do setor ${p.setor}` : 'Líder de setor' });
        if (d.liderCelula.length)
            out.push({ selo: 'celula', texto: `Líder ${cel(d.liderCelula)}` });
        if (d.casaCelula.length)
            out.push({ selo: 'casa', texto: `Anfitrião ${cel(d.casaCelula)}` });
        return out;
    },
    // Subtítulo do cartão (Spec 017): "Pi-Hairote · Membro", "Hope · Líder da célula" ou
    // "Líder do setor X"; os outros papéis viram selos pequenos.
    subtituloCartao(p, celula) {
        const papeis = regrasMapa.papeisDoCard(p);
        if (p.papel === 'lider_area' || p.papel === 'lider_setor')
            return { texto: papeis[0].texto, extras: papeis.slice(1) };
        const lidera = p.destaque?.liderCelula || [];
        const daPropria = !!celula && lidera.length === 1 && lidera[0] === celula;
        const papel = daPropria ? 'Líder da célula' : 'Membro';
        return { texto: celula ? `${celula} · ${papel}` : papel, extras: papeis.filter(x => !(daPropria && x.selo === 'celula')) };
    },
    // Botão principal do cartão: WhatsApp quando há telefone; sem telefone, registrar o contato
    acaoContato(urlWhatsapp) {
        return urlWhatsapp ? { tipo: 'whatsapp', rotulo: 'Entrar em contato' } : { tipo: 'registrar', rotulo: 'Registrar contato' };
    },
    pessoas(n) {
        return `${n} ${n === 1 ? 'pessoa' : 'pessoas'}`;
    },
    // Frase de situação acima do mapa. Com líderes no mapa, separa membros e líderes (Spec 014).
    resumo(f, ehLider = () => false) {
        const fora = f.soCidade.length + f.naoLocalizados.length + f.pendentes.length + f.semEndereco.length;
        if (!f.noMapa && !fora)
            return 'Ninguém neste filtro.';
        const areas = f.grupos.length === 1 ? '1 área' : `${f.grupos.length} áreas`;
        const lideres = f.grupos.reduce((n, g) => n + g.linhas.filter(ehLider).length, 0);
        const quem = lideres
            ? `${f.noMapa - lideres} ${f.noMapa - lideres === 1 ? 'membro' : 'membros'} · ${lideres} ${lideres === 1 ? 'líder' : 'líderes'}`
            : regrasMapa.pessoas(f.noMapa);
        return `${quem} no mapa, em ${areas}` + (fora ? `; ${regrasMapa.pessoas(fora)} sem posição (lista abaixo).` : '.');
    }
};
