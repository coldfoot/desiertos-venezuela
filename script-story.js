gsap.registerPlugin(ScrollTrigger);
let mapa_escuro, mapa_claro;
let scroller;
let margem_mapa = 50;

const colors = {
    "BOSQUE" : "#657034",
    "DESIERTO" : "#b26d36",
    "SEMIDESIERTO" : "#d4ba99",
    "SEMIBOSQUE" : "#e0d579"
}

Promise.all([
    fetch("ven.geojson"),
    fetch("ven_level_2.geojson")
])
.then(responses => Promise.all(
    responses.map(res => res.json())
)).then(data => {

    console.log(data);

    mapa_escuro = new Mapa("map-escuro", data);
    mapa_claro = new Mapa("map-claro", data);

    scroller = new Scroller("[data-step]");


});

class Mapa {

    constructor(ref, dados) {

        this.svg = d3.select("." + ref);
        this.dados = dados[0];
        this.dados_detalhados = dados[1];
        this.ref = ref;

        this.w = +this.svg.style("width").slice(0,-2);
        this.h = +this.svg.style("height").slice(0, -2);

        this.viewBox_inicial = `0 0 ${this.w} ${this.h}`;

        this.svg.attr("viewBox", this.viewBox_inicial);

        this.svg.attr("width", this.w);
        this.svg.attr("height", this.h);

        this.build();
        this.calcula_buracos();
        this.render();

        if (this.ref === "map-claro") {
            this.render_subnacionais();
            this.seta_triggers_buracos();
            this.seta_trigger_letras_titulo();
            this.seta_trigger_menu_burger();
        }


    }

    build() {

        this.features = this.dados.features;

        this.proj = d3.geoMercator()
            //.fitSize([this.w, this.h], this.dados)
            .fitExtent([[margem_mapa, margem_mapa], [this.w - margem_mapa, this.h - margem_mapa]], this.dados)
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
                .attr("opacity", 1)
            ;

            layer = this.svg.append("g")
                .attr("mask", `url(#${maskId})`);
        } 

        layer.append("rect")
            .attr("width", this.w)
            .attr("height", this.h)
            .classed("svg-bg-mapa", true)
            .attr("fill", this.ref === "map-claro" ? "#F4F4F4" : "#333")
        ;

        layer.selectAll("path.mapa")
                .data(this.features)
                .join("path")
                .classed("mapa", true)
                .classed(this.ref, true)
                .attr("d", this.path)
                .attr("stroke-width", 1)
            ;
    }

    render_subnacionais() {

        this.subnacionais = this.svg.append("g").classed("mapa-subnacionais", true)
            .selectAll("path.level2")
            .data(this.dados_detalhados.features)
            .join("path")
            .classed("level2", true)
            .attr("data-localidad", d => d.properties.name)
            .attr("data-classificacao", d => d.properties.classification)
            .attr("d", this.path)
            .style("fill", d => colors[d.properties.classification])
            .style("stroke", "transparent")
            .style("opacity", 0)
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

                "opacity" : 0

            });

            this.anims.push(new_anim);

        }

    }

    seta_trigger_letras_titulo() {

        gsap.to('span.bloco-letras', {

            delay: (d,i) => gsap.utils.random(0, 1),

            scrollTrigger: {
                trigger: `[data-step="0"]`,
                start: `top 50%`,
                end: `+=${this.h/2}`,
                scrub: .5
            },

            color: "#333",

        });

        gsap.to('span.bloco-vazio', {

            delay: (d,i) => gsap.utils.random(0, 1),

            scrollTrigger: {
                trigger: `[data-step="0"]`,
                start: `top 50%`,
                end: `+=${this.h/2}`,
                scrub: .5
            },

            backgroundColor: "#333",

        })

    }

    seta_trigger_menu_burger() {

        gsap.to('.btn-menu-img line', {

            scrollTrigger: {
                trigger: `[data-step="0"]`,
                start: `top 40%`,
                end: `+=${this.h/4}`,
                scrub: .5
            },

            stroke: "#333",

            onComplete: () => {
                document.querySelector(".logo-white").style.display = "none";
                document.querySelector(".logo-black").style.display = "block";
                console.log("FIM")
            },

            onReverseComplete: () => {
                document.querySelector(".logo-black").style.display = "none";
                document.querySelector(".logo-white").style.display = "block";
                console.log("FIM2")
            }

        })

    }

}


class Scroller {

    step_actions = {

        "Apertura" : () => {

            gsap.to("h1", {

                scrollTrigger : {
                    trigger: '[data-step="Apertura"]',
                    markers: false,
                    toggleClass: 'active',
                    pin: false,
                    scrub: 1,
                    start: "top bottom",
                    end: "top 50%",
                    toggleActions: "play reverse play reverse"
                },

                opacity: 0

            })

        },

        "Villa de Cura" : () => {

            const tl = gsap.timeline({

                    scrollTrigger : {
                        trigger: '[data-step="Villa de Cura"]',
                        markers: false,
                        toggleClass: 'active',
                        pin: false,
                        scrub: 1,
                        start: "top 75%",
                        end: "top 25%"

                        //onEnter : () => this.step_actions[step_name]("forward"),
                        //onEnterBack : () => this.step_actions[step_name]("back"),
                        //onLeave : () => v.scroller.linechart_regioes.render[step_name](forward = true),
                        //onLeaveBack : () => v.scroller.linechart_regioes.render[step_name](forward = false)

                    }

            });

            tl.to("svg.map-claro", 
                { 
                    attr: { viewBox: this.view_boxes["Zamora (Villa de Cura)"] }
                }
            ).to("svg.map-claro path", {
                attr: { 'stroke-width': 0.5 }
            })
            .to("path[data-localidad='Zamora (Villa de Cura)']",
                {
                    opacity: 1,
                    stroke: "black"
                }
            )

        },

        "Desiertos" : () => {

            const tl = gsap.timeline({

                    scrollTrigger : {
                        trigger: '[data-step="Desiertos"]',
                        markers: false,
                        toggleClass: 'active',
                        pin: false,
                        scrub: 0,
                        start: "top 75%",
                        end: "top 25%",

                        //onEnter : () => this.step_actions[step_name]("forward"),
                        //onEnterBack : () => this.step_actions[step_name]("back"),
                        //onLeave : () => v.scroller.linechart_regioes.render[step_name](forward = true),
                        //onLeaveBack : () => v.scroller.linechart_regioes.render[step_name](forward = false)

                    }

            });

            tl.to("svg.map-claro", 
                { 
                    attr: { viewBox: mapa_claro.viewBox_inicial }
                }
            ).to("svg.map-claro path", {
                attr: { 'stroke-width': 1 }
            })
            .to("path[data-localidad='Zamora (Villa de Cura)']",
                {
                    stroke: "transparent"
                }
            ).to("path[data-classificacao='DESIERTO']", {

                    opacity : 1

            })

        },

        "Semidesiertos" : () => {

            const tl = gsap.timeline({

                    scrollTrigger : {
                        trigger: '[data-step="Semidesiertos"]',
                        markers: false,
                        toggleClass: 'active',
                        pin: false,
                        start: "top 75%",
                        end: "top 25%",
                        scrub: 0
                        //toggleActions: "play reverse play reverse"

                        //onEnter : () => this.step_actions[step_name]("forward"),
                        //onEnterBack : () => this.step_actions[step_name]("back"),
                        //onLeave : () => v.scroller.linechart_regioes.render[step_name](forward = true),
                        //onLeaveBack : () => v.scroller.linechart_regioes.render[step_name](forward = false)

                    }

            });

            tl.to("path[data-classificacao='DESIERTO']", {

                    opacity: 0

            }).to("path[data-classificacao='SEMIDESIERTO']", {

                    opacity: 1

            })

        },

        "Semibosques" : () => {

            const tl = gsap.timeline({

                    scrollTrigger : {
                        trigger: '[data-step="Semibosques"]',
                        markers: false,
                        toggleClass: 'active',
                        pin: false,
                        start: "top 75%",
                        end: "top 25%",
                        scrub: 1
                        //toggleActions: "play reverse play reverse"

                        //onEnter : () => this.step_actions[step_name]("forward"),
                        //onEnterBack : () => this.step_actions[step_name]("back"),
                        //onLeave : () => v.scroller.linechart_regioes.render[step_name](forward = true),
                        //onLeaveBack : () => v.scroller.linechart_regioes.render[step_name](forward = false)

                    }

            });

            tl.to("path[data-classificacao='SEMIDESIERTO']", {

                    opacity : 0

            }).to("path[data-classificacao='SEMIBOSQUE']", {

                    opacity : 1

            })

        },
        
        "Bosques" : () => {

            const tl = gsap.timeline({

                    scrollTrigger : {
                        trigger: '[data-step="Bosques"]',
                        markers: false,
                        toggleClass: 'active',
                        pin: false,
                        start: "top 75%",
                        end: "top 25%",
                        scrub: 1
                        //toggleActions: "play reverse play reverse"

                        //onEnter : () => this.step_actions[step_name]("forward"),
                        //onEnterBack : () => this.step_actions[step_name]("back"),
                        //onLeave : () => v.scroller.linechart_regioes.render[step_name](forward = true),
                        //onLeaveBack : () => v.scroller.linechart_regioes.render[step_name](forward = false)

                    }

            });

            tl.to("path[data-classificacao='SEMIBOSQUE']", {

                    opacity : 0

            }).to("path[data-classificacao='BOSQUE']", {

                    opacity : 1

            })

        },

        "Mapa Completo" : () => {

            const tl = gsap.timeline({

                    scrollTrigger : {
                        trigger: '[data-step="Mapa Completo"]',
                        markers: false,
                        toggleClass: 'active',
                        pin: false,
                        start: "top 75%",
                        end: "top 25%",
                        scrub: 1

                        //onEnter : () => this.step_actions[step_name]("forward"),
                        //onEnterBack : () => this.step_actions[step_name]("back"),
                        //onLeave : () => v.scroller.linechart_regioes.render[step_name](forward = true),
                        //onLeaveBack : () => v.scroller.linechart_regioes.render[step_name](forward = false)

                    }

            });

            tl.to("path[data-classificacao]", {

                    opacity : 1

            })

        }   

    }

    view_boxes = {}

    constructor(step_selector) {

        this.start_parameter = "25% 60%";
        this.end_parameter = "75% 40%";

        const lista_cidades = ["Zamora (Villa de Cura)"];

        this.get_view_boxes(lista_cidades);

        this.steps = Object.keys(this.step_actions);

        this.steps.forEach(step => this.step_actions[step]());

        this.steps_elements = document.querySelectorAll(step_selector);


        //this.monitora_scroller();

    }

    /*
    get_view_boxes(lista_cidades) {

        const padding_x = 20;
        const padding_y = 15;

        lista_cidades.forEach(cidade => {

            const el_cidade = document.querySelector(`[data-localidad="${cidade}"]`);

            const bbox = el_cidade.getBBox();

            console.log(bbox);
    
            const viewBox = `${bbox.x - padding_x} ${ bbox.y - padding_y} ${bbox.width} ${bbox.height}`

            this.view_boxes[cidade] = viewBox;

        })

    }*/

    get_view_boxes(lista_cidades) {
        const padding = 100;
        const svg = document.querySelector("svg.map-claro");
        const aspect = svg.viewBox.baseVal.width / svg.viewBox.baseVal.height;

        lista_cidades.forEach(cidade => {
            const el = document.querySelector(`[data-localidad="${cidade}"]`);

            const bbox = el.getBBox();

            let width = bbox.width + 2 * padding;
            let height = bbox.height + 2 * padding;

            // Expand the shorter dimension so the viewBox matches the SVG viewport.
            if (width / height < aspect) {
                width = height * aspect;
            } else {
                height = width / aspect;
            }

            const x = bbox.x + bbox.width / 2 - width / 2;
            const y = bbox.y + bbox.height / 2 - height / 2;

            this.view_boxes[cidade] = `${x} ${y} ${width} ${height}`;
        });
    }

}