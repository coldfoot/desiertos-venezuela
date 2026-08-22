# Notas de desenvolvimento

- Precisamos determinar qual é a nomenclatura correta para utilizar – a que está no GeoJSON usado no Atlas del Silencio ou a que está no CSV? Por enquanto, estou presumindo que é a do CSV.
- Precisamos verificar se o LLM fez o merge manual correto entre as cidades com nomes diferentes no GeoJSON e no CSV.
- Os GeoJSONs podem precisar de simplificação.

#### Important
I'm unhappy with the way I structured the b_geomatch – influenced by an LLM, I matched each CSV name to the corresponding GeoJSON identifying code directly. This is hard to verify and hard to update in case we need to. Instead, we should be linking the actual names side by side, so a quick visual scope can be done.