# Spec 002 — Endereço do membro

- Status: **Entregue** (v1.23.0, 2026-11-21). Ver [release-validation.md](release-validation.md)
- Data: 2026-11-20
- ADRs: [0004](../../docs/architecture/adr/0004-enderecos-geocodificacao.md), [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md) (ambos **Aceitos** em 2026-11-20)
- Próximas specs que dependem desta: mapa (ADR-0005), anfitriões (ADR-0006), novas células (ADR-0007)

## Problema e objetivo
A liderança quer planejar a área pelo território: ver onde estão as pessoas, escolher
casas anfitriãs e planejar novas células. Hoje o VEC não guarda endereço. Esta spec
cria a base: registrar, com consentimento, o endereço residencial de cada pessoa,
com o mínimo de exposição possível. Coordenadas e mapa ficam para a próxima spec.

## Escopo
### Incluído
- Endereço opcional por pessoa: CEP, logradouro, número, complemento, bairro,
  cidade e UF.
- Cadastro, edição e remoção do endereço **pelo painel**, na ficha da pessoa.
- Registro do consentimento específico para o endereço: data e usuário que o
  registrou.
- Exibição do endereço na ficha, só para quem tem a pessoa no escopo.
- Remoção definitiva do endereço quando a pessoa pede ou quando o cadastro é
  excluído.

### Fora de escopo
- Geocodificação, coordenadas, mapa e qualquer cálculo de distância (Spec 003).
- Campo de endereço no formulário público (decisão 2).
- Endereço na exportação CSV.
- Recomendação de anfitriões e planejamento de células.

## Usuários e permissões
- **AREA, SETOR e CELULA:** veem, cadastram, editam e removem o endereço das
  pessoas do seu escopo, que é o mesmo da ficha, da foto e das anotações.
- Fora do escopo, a pessoa "não existe": a resposta é a mesma de um cadastro
  inexistente.
- A autorização é verificada no servidor, em SQL, em toda leitura e escrita.
  O filtro do navegador não é barreira.

## Requisitos funcionais
1. A ficha da pessoa ganha a seção **Endereço**, com estado vazio ("Sem endereço
   cadastrado") e ação para cadastrar.
2. Para salvar, é obrigatório marcar o consentimento (texto na decisão 4). O
   sistema grava a data e o usuário.
3. Campos obrigatórios ao salvar: CEP, logradouro, número (ou "s/n"), bairro,
   cidade e UF. O complemento é opcional.
4. O CEP é normalizado para 8 dígitos e a UF deve ser uma das 27 siglas válidas.
   Os textos são limpos e têm tamanho máximo.
5. "Remover endereço" apaga a linha de fato. Não é exclusão lógica.
6. Excluir o cadastro da pessoa apaga o endereço junto.
7. A ficha mostra quem atualizou o endereço por último e quando.

## Regras de negócio
- O endereço é dado pessoal de finalidade específica, a organização das células.
  O aceite do formulário não basta; é preciso o consentimento próprio do requisito 2.
- Sem consentimento registrado, o endereço não é salvo.
- O endereço não aparece em listas, buscas, Indicadores nem CSV, só na ficha.
- A minimização prevalece: nada de coordenadas nesta entrega.

## Cenários de aceite
1. **Dado** um líder CELULA com a pessoa no escopo, **quando** cadastrar um endereço
   válido com consentimento, **então** ele aparece na ficha com data e autor.
2. **Dado** o mesmo formulário sem o consentimento marcado, **quando** salvar,
   **então** nada é gravado e a mensagem pede a autorização.
3. **Dado** um líder SETOR, **quando** tentar ler ou salvar o endereço de alguém de
   outro setor, mesmo chamando a API diretamente, **então** recebe "não encontrado"
   e nada é gravado.
4. **Dado** um CEP com máscara (`60.000-000`), **quando** salvar, **então** ele é
   gravado como `60000000`. Com UF `XX` ou CEP de 7 dígitos, **então** recebe erro
   de validação.
5. **Dado** uma pessoa com endereço, **quando** o líder remover o endereço,
   **então** a linha deixa de existir no banco.
6. **Dado** uma pessoa com endereço, **quando** o cadastro for excluído, **então** o
   endereço também é apagado.
7. **Dado** a exportação CSV ou a lista de Pessoas, **quando** gerada, **então** não
   contém nenhum campo de endereço.
8. **Dado** celular de 390 px ou navegação só por teclado, **quando** editar o
   endereço, **então** todos os campos têm rótulo, ordem lógica, foco visível e
   mensagem de erro associada.

## Estados de interface e acessibilidade
Vazio, edição, salvando, erro de validação por campo, erro de servidor e removido.
Campos com `autocomplete` adequado (`postal-code`, `address-line1`, etc.), sem
overflow em 390 px e com movimento reduzido respeitado.

## Requisitos não funcionais
- Nenhuma dependência nova de runtime.
- Nenhum endereço real em specs, testes, logs ou PRs; testes só com dados fictícios.
- Logs de erro sem conteúdo do endereço.
- Migration nova e aditiva; nenhuma migration existente alterada.

## Decisões do responsável (2026-11-20)
1. **Quem vê o endereço exato:** todo o escopo da ficha (AREA; SETOR do setor da
   pessoa; CELULA da célula dela), igual a WhatsApp e foto.
2. **Entrada:** só pelo painel nesta entrega; o formulário público não muda.
3. **Busca pelo CEP:** incluída como T005 (ViaCEP, chamada do navegador, envia só o
   CEP). Se a busca falhar, o preenchimento continua manual.
4. **Texto do consentimento:** "A pessoa autorizou o uso do endereço para
   organização das células e pode pedir a remoção a qualquer momento." O sistema
   registra a data e quem marcou.

5. **Retenção (2026-11-21):** sem prazo por enquanto. O endereço fica enquanto a
   pessoa estiver cadastrada e não pedir a remoção. Revisão periódica será
   reavaliada na Spec 003.
