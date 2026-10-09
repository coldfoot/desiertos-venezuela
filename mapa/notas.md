https://docs.mapbox.com/mapbox-gl-js/guides/styles/work-with-layers/

            map.setPaintProperty(
                this.country + '-localidad',
                'fill-color',
                [
                    'match',
                    ['get', 'CLASSIFICATION'],
                    ...Object.keys(colors_css).flatMap(key => [key.toUpperCase(), colors_css[key]]),
                    'transparent'
                ]
            );

map.getSource('nome source')._vector_layers (ou algo do tipo)

ok 1. Adicionar BBOX aos large units e small units
ok 2. Gerar um mapão da venezuela
ok 3. remover cursor após clicar em provincia

Design:

Menu
Intuição de que o breadcrumb pode fazer alguma coisa. Fundo?

https://blog.master.dev/modern-css-round-out-tabs/


Quando clicar em um local de uma provincia diferente, atualizar o border highlight.

ok Implementar clique no botao do breadcrumb da provincia.

* Filtros de tipo de terreno;
* Menu;
* Destacar cidade

