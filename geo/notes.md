# Notas de desenvolvimento (geradas por LLM, revisadas pelo Mene)

## Pipeline

Rodar em ordem, de dentro da pasta dos scripts (todos os caminhos são relativos):

1. `a_download_csv.py` — baixa duas abas do Google Sheet → `../output/a_consolidado.csv` (dados do censo de meios) e `../output/a_respuestas.csv` (respostas do questionário).
2. `b_geomatch.py` — casa `estado` / `unidade` do CSV com os códigos oficiais dos geojsons → `../output/b_geomatched.csv`. É só uma tabela de correspondência (nomes + códigos), não um arquivo de mapa.
3. `c_namefix_geojson.py` — remove as Dependencias Federales (VE99) e reescreve os nomes dos geojsons com os nomes do CSV → `../output/c_level_1.geojson`, `c_level_2.geojson`.
4. `d_parse_answers.py` — conta as respostas do questionário, no país inteiro e por estado → `../output/d_answers/{nome}_totales.json` e `{nome}_porcentajes.json`.
5. `e_make_data_json.py` — junta geometria + censo + respostas → `../output/data.json`, com as três chaves `country`, `large_units`, `small_units`.

Entradas fixas, não geradas pelo pipeline: `../input/level-1.geojson` e `../input/level-2.geojson`.

## Pendências

### Nomenclatura
- **Decidido (provisoriamente):** os nomes canônicos são os do CSV. Os geojsons são reescritos em `c_` para seguir o CSV. **Falta confirmar com a Dani.**
- Geometrias que não aparecem no CSV mantêm o nome original do geojson com a tag `" <inherited>"`. Quando os CSVs estiverem finais, remover a tag em `apply_naming_pairs()` e confiar nos nomes.

### Verificação dos matches manuais
- ~55 entradas em `manual_l2_fixes` (`b_geomatch.py`) estão marcadas `Human check: PENDING`. Cada uma já traz o nome do geojson em comentário ao lado, então dá pra conferir visualmente no próprio arquivo — mas a conferência ainda não foi feita.
- O `verify()` garante que nenhuma linha se perdeu, duplicou ou ficou sem código. Ele **não** garante que o código atribuído é o certo — isso continua sendo trabalho humano.

### Geojsons
- Podem precisar de simplificação (tamanho de arquivo para a web).
- VE99 (Dependencias Federales) sai do pipeline no passo `c_` e nunca chega ao `data.json`.

### Questionário
- `d_parse_answers.py` imprime as respostas livres ("Otro") para revisão manual. Elas **não** são normalizadas nem reclassificadas nas categorias oficiais — hoje entram só como contagem agregada de "Otro". 
- O `assert` no `main()` exige que o conjunto de estados de `a_respuestas.csv` seja exatamente o de `c_level_1.geojson`. Se a coleta mudar, o script quebra de propósito.

### data.json
- Municípios sem correspondência no CSV entram com `HAS_DATA: false` e `CLASSIFICATION: "Sin datos"` — o renderer precisa tratar essa string como cinza, e não como uma categoria real.
- Os agregados de estado/país somam tratando ausente como 0 (`total()`). Enquanto os dados estiverem incompletos, esses números são preview de desenvolvimento, não resultado final.