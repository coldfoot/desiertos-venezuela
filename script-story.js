gsap.registerPlugin(ScrollTrigger);
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
        this.calcula_buracos();
        this.render();

        if (this.ref === "map-claro") {
            this.seta_triggers_buracos();
        }


    }

    build() {

        this.features = this.dados.features;

        this.proj = d3.geoMercator()
            .fitSize([this.w, this.h], this.dados)
        ;

        this.path = d3.geoPath().projection(this.proj);

    }

    calcula_buracos() {

        const ideal_side = 100;

        const n_w = Math.floor(this.w / ideal_side);
        let n_h = Math.floor(this.h / ideal_side);

        const actual_w = n_w * ideal_side;
        const dif_w = (this.w - actual_w);

        const side = ideal_side + dif_w;

        const actual_h = n_h * side
        if (actual_h < this.h) n_h++;

        this.n_w = n_w;
        this.n_h = n_h;
        this.side = side;

        this.buracos = [];

        for (let j = 0; j < n_h; j++) {

            for (let i = 0; i < n_w; i++) {

                const buraco = {
                    x : i * side,
                    y : j * side,
                    'side' : side,
                    I : i,
                    J : j
                }

                this.buracos.push(buraco);


            }

        }

    }

    render() {

        let layer = this.svg;

        if (this.ref === "map-claro") {
            const maskId = "map-claro-mask";
            const squares = this.buracos;

            const mask = this.svg.append("defs")
                .append("mask")
                .attr("id", maskId)
                .attr("maskUnits", "userSpaceOnUse")
                .attr("maskContentUnits", "userSpaceOnUse")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.w)
                .attr("height", this.h);

            mask.append("rect")
                .attr("width", this.w)
                .attr("height", this.h)
                .attr("fill", "white");

            mask.selectAll("rect.hole")
                .data(squares)
                .join("rect")
                .attr("class", "hole")
                .attr("data-i", d => d.I)
                .attr("data-j", d => d.J)
                .attr("x", d => d.x)
                .attr("y", d => d.y)
                .attr("width", d => d.side)
                .attr("height", d => d.side)
                .attr("fill", "black")
                .attr("opacity", 0)
            ;

            layer = this.svg.append("g")
                .attr("mask", `url(#${maskId})`);
        } 

        layer.append("rect")
            .attr("width", this.w)
            .attr("height", this.h)
            .attr("fill", this.ref === "map-claro" ? "#F4F4F4" : "#333")
        ;

        layer.selectAll("path.mapa")
                .data(this.features)
                .join("path")
                .classed("mapa", true)
                .classed(this.ref, true)
                .attr("d", this.path)
            ;
    }

    constroi_controle_buracos() {

        this.buracos_a_ativar = [];

        for (let j = 0; j < this.n_h; j++) {
            
            const linha = [];

            for (let i = 0; i < this.n_w; i++) {

                linha.push(i);

            }

            this.buracos_a_ativar.push(linha);

        }

        this.buracos_ativados = [];
        this.buracos_meio_ativados = [];

    }

    seta_triggers_buracos() {

        this.anims = [];

        for (let j = 0; j < this.n_h; j++) {

            const new_anim = gsap.to(`[data-j="${j}"]`, {

                delay: (d,i) => gsap.utils.random(0, 0.2),

                scrollTrigger: {
                    trigger: `[data-step="0"]`,
                    start: `top ${(j + 1) * this.side}px`,
                    end: `+=${this.side}px`,
                    scrub: .5
                },

                "opacity" : 1

            });

            this.anims.push(new_anim);

        }

    }

}
