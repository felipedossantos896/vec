# Handoff — V0.3

- T001 / Issue #227, branch `codex/studio-v03`. Base `a3d862c`, PR #226 incorporado.
- A07, A08, A14 e A15 com estado em memória e diálogo nativo.
- `STUDIO_CHROME=1 STUDIO_ARTIFACTS=/tmp/vec-studio-v03 node design-system/tests/people.mjs` passou em 1920×1080, 2560×1440, 3840×2160 e 390×844. Busca, filtro, teclado, retorno de foco, cadastro/edição fictícios e ausência de overflow nos frames de ficha/formulário. Capturas locais de lista, ficha e cadastro.
- Próximo: CI, revisão independente e merge. Depois avançar V0.4.
- A primeira revisão identificou nomes iguais e data fixa. O vínculo agora usa ID, e o limite usa a data local. O cenário automatizado cria um homônimo na data simulada e verifica o vínculo após renomear.
- A busca verifica nome e discipulador separadamente. O teste cobre a busca cruzada e a combinação de busca com célula que gera estado vazio.
- A lista preserva os filtros após cadastro. Testes incluem nome só com espaços, aviso de validação e cancelamento de edição sem alterar o registro.
- Aviso de salvamento separado do estado da lista. Teste move a última pessoa do recorte e verifica o estado vazio ao fechar a ficha.
