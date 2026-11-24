# ADR-0012 — Pacote de ícones do painel

- Status: **Aceito** em 2026-11-24 pelo responsável. Implementado pela Spec 014.
- Data: 2026-11-24
- Complementa: [ADR-0009](./0009-identidade-visual.md) e [ADR-0002](./0002-design-system.md)

## Contexto
Os ícones do painel são SVGs desenhados à mão, cada um num estilo. A Spec 014 precisa de
selos de papel (área, setor, célula e casa) e de botões-ícone, e o responsável pediu um
pacote bonito que sirva também para o que vier depois.

Restrições:
- CSP estrita, sem fonte nem script de outro domínio;
- sem dependência em tempo de execução;
- repositório público, então a licença precisa permitir cópia.

## Decisão
Adotar o **Phosphor Icons** (`@phosphor-icons/core`, versão fixa 2.1.1, licença MIT):
- é um desenho único, com cerca de 1.500 ícones e **seis pesos** (*thin*, *light*,
  *regular*, *bold*, *fill* e *duotone*). O *fill* serve para selos pequenos e o *bold*
  para botões;
- tem os símbolos de que precisamos, inclusive marcas como `whatsapp-logo`;
- **só os ícones usados** entram no painel, como caminhos SVG em `icones.ts`, gerados por
  script a partir do pacote com a versão fixa e com a licença no repositório;
- uso: `icone(nome, { peso, rotulo })`, com a cor herdada (`currentColor`).

## Alternativas
- **Lucide** (ISC): bonito e parecido com os ícones atuais, mas só tem contorno (sem
  *fill* para selos) e não tem ícones de marca, como o do WhatsApp.
- **Tabler** (MIT): maior (cerca de 6.000), mas a maioria só tem contorno.
- **Remix Icon:** a licença mudou a partir da v4.9.
- Continuar desenhando à mão: inconsistente e mais lento.

## Consequências
- Visual consistente e reaproveitável.
- Ícone novo = uma linha no script, que gera o arquivo de novo.
- Os ícones antigos são trocados aos poucos, em outra spec.
- O peso no painel é só o dos caminhos usados (poucos KB).

## Validação
- Licença presente no repositório;
- versão fixa no script;
- zero violação de CSP;
- rótulos acessíveis nos ícones com significado.
