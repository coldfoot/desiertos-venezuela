let mapa_escuro, mapa_claro;

fetch("ven.geojson").then(response => response.json()).then(data => {

    console.log(data);

    mapa_escuro = new Mapa("map-escuro", data);
    mapa_claro = new Mapa("map-claro", data);


})

class Mapa {

    constructor(ref, dados) {

        this.svg = d3.select("." + ref);
        this.dados = dados;
        this.ref = ref;

        this.w = +this.svg.style("width").slice(0,-2);
        this.h = +this.svg.style("height").slice(0, -2);

        this.svg.attr("viewBox", `0 0 ${this.w} ${this.h}`);

        this.svg.attr("width", this.w);
        this.svg.attr("height", this.h);

        this.build();
        this.render();


    }

    build() {

        this.features = this.dados.features;

        this.proj = d3.geoMercator()
            .fitSize([this.w, this.h], this.dados)
        ;

        this.path = d3.geoPath().projection(this.proj);

    }

    render() {

        this.svg.selectAll("path.mapa")
            .data(this.features)
            .join("path")
            .classed("mapa", true)
            .classed(this.ref, true)
            .attr("d", this.path)
        ;
    }

}