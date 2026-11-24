# Plano técnico — Alfinete

Reaproveitar o escopo de endereço, as colunas de geocodificação e o Leaflet. A versão do endereço protege a confirmação de pontos obsoletos. Identificar no mapa os grupos exatos por coordenada e manter a grade para resultados automáticos. Invalidar os marcadores em memória ao salvar, revogar ou sair da sessão.

Verificar consentimento, escopo, proteção contra sobrescrita, revogação, agrupamento e controles com dados fictícios.

## Rollback

Se nenhum ponto manual foi gravado, reverter o PR pelo fluxo de release. Se já houver pontos manuais, a operação de rollback exige revisão explícita e janela sem gravações no painel ou nos jobs de geocodificação. Antes de restaurar o código anterior, confirmar backup e contagem das linhas manuais, limpar os campos abaixo em transação e verificar que não sobrou nenhuma linha manual:

```sql
UPDATE enderecos
   SET lat = NULL, lng = NULL, geo_fonte = NULL, geo_precisao = NULL, geo_em = NULL
 WHERE geo_precisao = 'manual';
```

Só então restaurar a versão anterior e retomar gravações. Os endereços permanecem, passam a ficar pendentes de geocodificação e precisam de uma nova confirmação para voltar a mostrar alfinete exato. Restaurar um backup que contenha pontos manuais requer aplicar a mesma limpeza antes de permitir gravações pelo código anterior.
