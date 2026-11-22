# ADR-0011 — Rostos no mapa e privacidade

- Status: **Aceito** em 2026-11-22 pelo responsável. Implementado pela Spec 009.
- Data: 2026-11-22
- Complementa: [ADR-0008](./0008-privacidade-autorizacao.md) e [ADR-0005](./0005-mapa-membros.md)

## Contexto
A identidade nova mostra o rosto (foto ou avatar) e o primeiro nome de cada pessoa no
mapa. Hoje o mapa mostra áreas de ~300 m com contagens, e os nomes só ao tocar. Rosto e
posição juntos tornam a pessoa mais identificável.

## Decisão proposta
- **Mesmo escopo de hoje:** só quem já vê a pessoa na lista vê o rosto no mapa; o
  servidor continua mandando só o centro da área de ~300 m, nunca a coordenada.
- **Pessoas na mesma área** aparecem empilhadas (rostos sobrepostos com o número); o
  zoom não separa abaixo da precisão da área.
- **Sem foto**, entra um **avatar ilustrado gerado** a partir de um identificador interno
  (sem nome, sem dado pessoal), sempre o mesmo para a mesma pessoa.
- A **foto** só aparece no mapa se já estiver cadastrada na ficha (mesma regra de hoje
  para foto); não há foto nova coletada por causa do mapa.
- O formulário público **não** mostra casas nem bairros de anfitriões.

## Alternativas
Só contagens no mapa (como hoje); rostos só ao tocar na área; iniciais em vez de rosto.

## Consequências
Mais identificação visual para quem já tem acesso; nenhuma informação nova sai do
escopo. Em áreas com uma pessoa só, o rosto revela quem mora naquela área de ~300 m —
o mesmo que o nome já revela hoje ao tocar.

## Validação
Resposta da API sem coordenada; escopo conferido por perfil; avatar sem dado pessoal;
foto ausente cai no avatar; teste com áreas de uma e de várias pessoas.
