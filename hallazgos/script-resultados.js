fetch("../geo/output/data.json").then(response => response.json()).then(
    data => {

        const prep_data = prepare_data(data);

        console.log(prep_data);

        viz(prep_data);


    }
)


function prepare_data(data) {

    const prep_data = [];

    data.large_units.forEach(large_unit => {

        const code = large_unit.BASIC_INFO.LEVEL_1_CODE;
        const name = large_unit.BASIC_INFO.NAME;
        const counts_conf = large_unit.BASIC_INFO.CLASSIFICATION_COUNTS;
        const pop_conf = large_unit.BASIC_INFO.POPULATION;

        const counts = {};

        const small_units = data.small_units.filter(d => d.BASIC_INFO.LEVEL_1_CODE == code);

        const paysages = ["Desierto", "Semidesierto", "Semibosque", "Bosque"];

        let qde_total = 0;
        let pop_total = 0;
        
        paysages.forEach(paysage => {

            const small_units_dessa_paysage = small_units.filter(d => d.BASIC_INFO.CLASSIFICATION == paysage);

            counts[paysage] = {};

            counts[paysage]["qde_inicial"] = qde_total; // acumulados, para posicionar as barras
            counts[paysage]["pop_inicial"] = pop_total; // acumulados, para posicionar as barras

            const qde = small_units_dessa_paysage.length;
            qde_total += qde;
            const pop = qde == 0 ? 0 : small_units_dessa_paysage.map(d => d.BASIC_INFO.POPULATION).reduce( (pv, cv) => pv + cv);
            pop_total += pop;

            counts[paysage]["qde"] = qde;
            counts[paysage]["pop"] = pop;

        })

        const mini_data = {
            code, name, counts_conf, pop_conf, counts, pop_total, qde_total
        }

        prep_data.push(mini_data);

    })

    prep_data.sort( (a,b) => - a.counts["Desierto"].qde / a.qde_total + b.counts["Desierto"].qde / b.qde_total);

    return prep_data;

}

function viz(data) {

    const svg = d3.select("svg.chart-resultados");

    const w = svg.style("width").slice(0,-2);
    const h = svg.style("height").slice(0,-2);

    svg.attr("viewBox", `0 0 ${w} ${h}`);
    svg.attr("width", w);
    svg.attr("height", h);

    const margin = 20;

    // escala

    const estados = data.map(d => d.name);

    const y = d3.scaleBand(estados,
        [margin, h - margin]).padding(.25)
    ;

    console.log(y.bandwidth());

    const x = d3.scaleLinear().domain([0,100]).range([ margin * 4, w ]);
    const width = d3.scaleLinear().domain([0,100]).range([0, w - 4*margin]);

    const color_codes = {
        Bosque: "#657034",
        Desierto: "#b26d36",
        Semidesierto: "#d4ba99",
        Semibosque: "#e0d579"
    };

    // objetos;

    data.forEach(estado => {

        const qde_total = estado.qde_total;
        const pop_total = estado.pop_total;

        const g = svg.append("g").classed("barra-estado", true);

        const paisages = Object.keys(estado.counts);

        paisages.forEach(paisage => {

            const mini_data = estado.counts[paisage];

            const pct_qde_inicial = Math.round(1000 * mini_data.qde_inicial / qde_total) / 10;
            const pct_pop_inicial = Math.round(1000 * mini_data.pop_inicial / pop_total) / 10;
            const pct_qde = Math.round(1000 * mini_data.qde / qde_total) / 10;
            const pct_pop = Math.round(1000 * mini_data.pop / pop_total) / 10;

            g.append("rect").classed("barra-paisagem", true)
                .datum({pct_qde_inicial, pct_qde, pct_pop_inicial, pct_pop})
                //.attr("data-qde-x", x(pct_qde_inicial))
                //.attr("data-qde-w", width(pct_qde))
                //.attr("data-pop-x", x(pct_pop_inicial))
                //.attr("data-pop-w", width(pct_pop))
                .attr("x", x(pct_qde_inicial))
                .attr("y", y(estado.name))
                .attr("width", width(pct_qde) )
                .attr("height", y.bandwidth())
                .attr("fill", color_codes[paisage])
            ;

        })



    })

    const wrapper_btns = document.querySelector(".wrapper-button-chart-resultado");

    wrapper_btns.addEventListener("click", e => {

        if (e.target.tagName == "BUTTON") {

            const modo = e.target.dataset.tipoBtn;

            wrapper_btns.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));

            e.target.classList.add("active");

            d3.selectAll('rect.barra-paisagem').transition().duration(500)
                .attr("x", d => x(d[`pct_${modo}_inicial`]))
                .attr("width", d => width(d[`pct_${modo}`]))
            ;

        }

    })

    // labels

    const nomes = data.map(d => d.name);

    console.log(nomes);

    d3.select(".wrapper-chart-resultados").selectAll("p.label-chart").data(nomes).join("p").classed("label-chart", true)
        .style("top", d => y(d) + "px")
        .style("height", y.bandwidth() + "px")
        .style("line-height", y.bandwidth() + "px")
        .style("width", 4 * margin + "px")
        .text(d => d)
    ;

    const labels = [0, 20, 40, 60, 80, 100];
    d3.select(".wrapper-chart-resultados").selectAll("p.ticks").data(labels).join("p").classed("ticks", true)
        .style("left", d => x(d) + "px")
        .style("top", 0)
        .text(d => d + "%")
    ;

}
