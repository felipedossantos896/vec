# Plano

Reaproveitar a camada do #258: MapLibre GL JS 5.19.0 (build CSP) e adaptador Leaflet 0.1.4 versionados em `admin/vendor/maplibre`, conferidos byte a byte contra os pacotes npm. Sem chave nem endpoint de configuração. CSP específica para `/admin/` e o worker, liberando só `tiles.openfreemap.org` e `worker-src 'self'`. O fundo vetorial entra em `whenReady`, porque o adaptador exige centro e zoom.
