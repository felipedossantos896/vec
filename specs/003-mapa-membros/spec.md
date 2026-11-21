# Spec 003 — Mapa de membros

- Status: **Aprovada** (2026-11-21)
- Data: 2026-11-21
- ADRs: [0005](../../docs/architecture/adr/0005-mapa-membros.md) (Aceito em 2026-11-21), [0004](../../docs/architecture/adr/0004-enderecos-geocodificacao.md) e [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md) (Aceitos)
- Depende de: [Spec 002](../002-endereco-membro/spec.md) (entregue)

## Problema e objetivo
A liderança quer ver onde estão as pessoas da área para planejar células e visitas.
A Spec 002 guarda o endereço, mas sem coordenadas. Esta spec transforma o endereço
em uma posição aproximada e mostra no painel um mapa por setor e célula, sem
revelar a casa de ninguém.

## Escopo
### Incluído
- Geocodificação **no servidor** ao salvar o endereço, com Nominatim
  (OpenStreetMap), em nível de rua: a consulta leva rua, bairro, cidade, UF e CEP,
  **sem número nem complemento**.
- Coordenadas guardadas junto do endereço, com fonte, precisão e data.
- Comando de carga única para os endereços já cadastrados, respeitando o limite
  do Nominatim.
- Visão **Mapa** no painel, com fundo do OpenStreetMap via Leaflet e os mesmos
  filtros de setor e célula.
- Posição **aproximada**: as pessoas são agrupadas em células de ~300 m, e cada
  grupo mostra a contagem e a lista de nomes. O endereço exato continua só na ficha.
- Lista de "sem posição no mapa", para quem não tem endereço ou não foi
  geocodificado.

### Fora de escopo
- Ponto exato da casa no mapa, ajuste manual do ponto e rotas ou distâncias
  (Spec de anfitriões, ADR-0006).
- Mapa offline, exportação de coordenadas e mapa no formulário público.
- Autocompletar endereço pelo Nominatim (proibido pela política de uso).

## Usuários e permissões
- Cada líder vê no mapa apenas as pessoas do seu escopo (AREA, SETOR, CELULA),
  com a mesma regra da ficha.
- O servidor nunca envia coordenadas exatas ao navegador: só o centro da célula de
  ~300 m. O escopo é aplicado no SQL.

## Requisitos funcionais
1. Ao salvar um endereço (Spec 002), o servidor tenta geocodificar em segundo plano.
   O salvamento nunca espera nem falha por causa disso.
2. Resultado guardado: `lat`, `lng`, `geo_fonte` (`nominatim`), `geo_precisao`
   (`rua`, `bairro`, `cidade` ou `nao_encontrado`) e `geo_em`. Endereço alterado
   invalida a coordenada anterior.
3. Se a rua não for encontrada, tenta bairro + cidade e grava a precisão
   correspondente. Se nada for encontrado, grava `nao_encontrado` e a pessoa
   aparece na lista "sem posição".
4. A visão Mapa mostra os grupos de ~300 m com contagem. Ao tocar num grupo,
   aparecem os nomes, que abrem a ficha.
5. Filtros de setor e célula iguais aos das outras visões. Os números do mapa
   acompanham o filtro.
6. A atribuição "© OpenStreetMap contributors" fica sempre visível, com link para
   reportar erro no mapa.
7. Com geocodificação desligada ou Nominatim indisponível, o resto do painel
   funciona normalmente e o mapa mostra o que já estiver geocodificado.

## Regras de negócio e política de uso do Nominatim
- No máximo **1 requisição por segundo** somando toda a aplicação, de uma única
  instância. A carga única roda a **no máximo 4 por minuto**, em um só processo.
- User-Agent próprio, que identifica o VEC e traz um contato.
- Cache obrigatório: a coordenada fica no banco e a mesma consulta não se repete.
- Um interruptor por variável de ambiente (`GEOCODER=off`) desliga a geocodificação
  sem nova versão, como a política exige.
- Nenhum nome, número, complemento ou outro dado do cadastro é enviado.
- Os tiles seguem a política do OpenStreetMap: atribuição visível, Referer enviado,
  sem pré-carga nem uso offline, e cache do navegador respeitado.

## Cenários de aceite
1. **Dado** um endereço salvo com rua existente, **quando** a geocodificação
   terminar, **então** ele tem `geo_precisao = rua` e a pessoa aparece no mapa num
   grupo de ~300 m.
2. **Dado** uma rua não encontrada, **então** o sistema usa bairro ou cidade e
   registra a precisão. Se nada for encontrado, a pessoa vai para "sem posição".
3. **Dado** um líder CELULA, **quando** abrir o mapa, **então** só vê grupos e nomes
   da sua célula, mesmo chamando a API diretamente.
4. **Dado** qualquer resposta da API do mapa, **então** ela não contém coordenada
   exata, número nem complemento.
5. **Dado** `GEOCODER=off` ou o Nominatim fora do ar, **quando** um endereço é salvo,
   **então** ele é salvo normalmente e fica pendente de geocodificação.
6. **Dado** um endereço alterado, **então** a coordenada antiga deixa de valer até a
   nova geocodificação.
7. **Dado** o filtro de setor, **quando** alterado, **então** mapa, contagens e
   lista "sem posição" mudam juntos.
8. **Dado** celular de 390 px ou teclado, **então** o mapa é utilizável, os grupos
   são focáveis, há alternativa em lista e a atribuição está visível.

## Estados de interface e acessibilidade
Carregando, vazio ("ninguém com endereço neste filtro"), parcial (com a lista
"sem posição"), erro de carga do mapa (a lista continua funcionando). Os grupos
são botões acessíveis, e a lista equivalente funciona sem o mapa.

## Requisitos não funcionais
- Dependência nova de frontend: Leaflet, versionado no repositório, com versão
  fixa e sem CDN. Nenhuma dependência nova no Go.
- Nenhuma coordenada ou endereço real em testes, logs ou PRs. Os testes usam um
  Nominatim falso (`httptest`).
- Migration nova e aditiva.

## Decisões do responsável (2026-11-21)
1. **Geocodificação:** Nominatim/OpenStreetMap, no servidor, em nível de rua.
2. **Precisão:** aproximada no mapa (grupos de ~300 m); endereço exato só na ficha.
3. **Mapa:** Leaflet versionado no repositório, com tiles do OpenStreetMap.
4. **Acesso:** todo o escopo, como a ficha.
5. **Contato no User-Agent:** a URL pública do repositório, sem e-mail:
   `VEC-AreaVEC/<versão> (+https://github.com/felipedossantos896/vec)`.
6. **Retenção:** mantida sem prazo (decisão da Spec 002 confirmada com o uso no mapa).
