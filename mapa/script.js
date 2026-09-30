// tileset: tiagombp.rzef2q0scjuf


mapboxgl.accessToken = 'pk.eyJ1IjoidGlhZ29tYnAiLCJhIjoiY2thdjJmajYzMHR1YzJ5b2huM2pscjdreCJ9.oT7nAiasQnIMjhUB-VFvmw';

map = new mapboxgl.Map({
    container: 'map',
    // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
    style: 'mapbox://styles/tiagombp/cmt7q62ag00kd01s41rpf5ogn',
    center: [-64.93648, 6.176132],
    //bounds: [-73.3911486, 0.6493155, -56.4818190, 15.7029483]   
    zoom: 4
});

/*
const xmin = -73.3911486;
const ymin = 0.6493155;
const xmax = -56.4818190;
const ymax = 15.7029483;

const bbox = [
  [xmin, ymin],
  [xmax, ymin],
  [xmax, ymax],
  [xmin, ymax]//,
  //[xmin, ymin]
];

const venezuela_bbox = [-73.3911486, 0.6493155, -56.4818190, 15.7029483];
*/

let data, current_place_data, current_large_unit, current_small_unit;

let padding = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20
}

fetch("../geo/output/data.json").then(response => response.json()).then(data_ => init(data_));

function init(data_) {

  data = data_;

  const color_codes = {
    BOSQUE: "#657034",
    DESIERTO: "#b26d36",
    SEMIDESIERTO: "#d4ba99",
    SEMIBOSQUE: "#e0d579"
};

  colors = Object.entries(color_codes).flat();

  console.log(colors);

  init_map(data);

}

function init_map() {

  // já preenche os dados da Venezuela no card
  current_place_data = data.country[0];
  preenche_dados_card();

  map.on('load', () => {

  /*
  map.fitBounds([-73.3911486, 0.6493155, -56.4818190, 15.7029483] , {
    padding: 50,
    duration: 0
  });*/

  /*
  map.addSource('bbox', {
    type: 'geojson',
    data: {
        type: 'Feature',
        geometry: {
        type: 'Polygon',
        coordinates: bbox
        }
    }
  });

  map.addLayer({
    id: 'bbox',
    type: 'line',
    source: 'bbox',
    paint: {
        'line-color': 'red',
        'line-width': 10,
        'line-dasharray': [2, 2]
    }
  });*/

  map.addSource('large-units', {
      'type': 'vector',
      'url': 'mapbox://tiagombp.l4n4rlnd4xsh',
      'promoteId' : 'code'
  });

  map.addSource('small-units', {
      'type': 'vector',
      'url': 'mapbox://tiagombp.4u3ayb1hj5di',
      'promoteId' : 'code'
  });

  /* camadas das small units */

  map.addLayer({
    'id': 'small_units_fill',
    'type': 'fill',
    'source': 'small-units',
    'source-layer': "ccfc20288643c896b78c",
    'paint': {
        'fill-color' :
          [
              'match',
              ['to-string', ['get', 'classification']],
              ...colors,
              'transparent'
          ]/*,
        'fill-outline-color' : 'gray'*/
    }
  });

  /* camadas das large units */

  let provinciaHoveredId = null;

  map.addLayer({
    'id': 'large_units_hover',
    'type': 'fill',
    'source': 'large-units',
    'source-layer': "e6ce5cc1dd5b09147e8a",
    'paint': {
        'fill-color' : 'white',
        'fill-opacity': [
          'case',
          [
              'boolean', 
              ['feature-state', 'hover'], 
              false
          ],
          .5,
          0
        ]
      }
  });

  map.addLayer({
      'id': 'large_units_border',
      'type': 'line',
      'source': 'large-units',
      'source-layer': "e6ce5cc1dd5b09147e8a",
      'paint': {
          'line-color' : 'black',
          'line-width' : 3
      },
      'filter': ['==', 'provincia', '']
  });

  map.addLayer({
      'id': 'large_units_border_hover',
      'type': 'line',
      'source': 'large-units',
      'source-layer': "e6ce5cc1dd5b09147e8a",
      'paint': {
          'line-color' : '#333',
          'line-width': [
            'case',
            [
                'boolean', 
                ['feature-state', 'hover'], 
                false
            ],
            3,
            1
          ]
        }
  });

  const popup_large_units = new mapboxgl.Popup(
      {
          closeButton: false,
          loseOnClick: false
      }
  );

  /* handlers */

  function mouse_enter_handler_large(e) {
    
    map.getCanvas().style.cursor = 'pointer';

    const place_id = e.features[0].properties.code;
    const place_name = e.features[0].properties.name;
    const place_data = data.large_units.filter(d => d.BASIC_INFO.LEVEL_1_CODE == place_id)[0]
    const centroid = place_data.CENTROID;

    let coordinates = [
      centroid.xc,
      centroid.yc
    ]; 

    popup_large_units.setLngLat(coordinates).setHTML(place_name).addTo(map);

    if (provinciaHoveredId) {
        map.setFeatureState(
            { 
              source: 'large-units',
              sourceLayer: "e6ce5cc1dd5b09147e8a",
              id: provinciaHoveredId
            },

            { hover : false }
        )

    }

    provinciaHoveredId = place_id;

    map.setFeatureState(
        { 
          source: 'large-units',
          sourceLayer: "e6ce5cc1dd5b09147e8a",
          id: provinciaHoveredId
        },

        { hover : true }
    )

  }

  function mouse_leave_handler_large() {

    popup_large_units.remove();

    if (provinciaHoveredId) {
        
      map.setFeatureState(

        { 
          source: 'large-units',
          sourceLayer: "e6ce5cc1dd5b09147e8a",
          id: provinciaHoveredId
        },

          { hover: false }
      );
    }

    provinciaHoveredId = null;

  }

  function click_handler_large(e) {
    
    const place_name = e.features[0].properties.name;

    //last_provincia_location_data = place_data;

    // limpa o hover state featureState

    // não teria que setar o provinciaHoveredId para null?
    //provinciaHoveredId = null;

    map.setFeatureState(
        { 
          source: 'large-units',
          sourceLayer: "e6ce5cc1dd5b09147e8a",
          id: provinciaHoveredId
        },

        { hover : false }
    );

    render_large_unit(place_name);

  }

  function toggle_events_large_units(mode) {

    if( mode == "on") {

      map.on('mousemove', 'large_units_hover', mouse_enter_handler_large);
      map.on('mouseleave', 'large_units_hover', mouse_leave_handler_large);
      map.on("click", 'large_units_hover', click_handler_large);

    } else {

      map.off('mousemove', 'large_units_hover', mouse_enter_handler_large);
      map.off('mouseleave', 'large_units_hover', mouse_leave_handler_large);
      map.off("click", 'large_units_hover', click_handler_large);

    }

  }
  /* inicia handlers */
  toggle_events_large_units("on");

  /*
  map.on('mousemove', 'large_units_hover', mouse_enter_handler_large);
  map.on('mouseleave', 'large_units_hover', mouse_leave_handler_large);
  */

  render_venezuela();

  function render_any_place() {

    const bbox = Object.values(current_place_data.BBOX);
    update_barra_classificacao();
    preenche_dados_card();
    atualiza_bread_crumb();

    map.fitBounds(
      
      bbox, 

      {
          linear : false, // false means the map transitions using map.flyTo()
          speed: 1, 
          padding: padding//{top: 80, bottom: 100, left: 30, right: 30},
      }

    );

  }

  function render_venezuela() {

    console.log("Rendering Venezuela, ", provinciaHoveredId)
    
    // pega os dados
    current_place_data = data.country[0];
    
    // reseta as informações do contexto
    current_large_unit = undefined;
    current_small_unit = undefined;

    render_any_place();

    // remove o highlight na large unit
    toggle_highlight_large_unit("");

    // habilita os eventos de provincia
    toggle_events_large_units("on");

  }

  function render_large_unit(place_name) {

    // pega os dados    
    current_place_data = data.large_units.filter(d => d.BASIC_INFO.NAME == place_name)[0];
    console.log(current_place_data);

    const place_id = current_place_data.BASIC_INFO.LEVEL_1_CODE;

    // atualiza informações de contexto
    current_large_unit = place_name;
    current_small_unit = undefined;

    render_any_place();

    // coloca a borda
    toggle_highlight_large_unit(place_id);

    // desabilita os eventos de provincia
    toggle_events_large_units("off");

  }

  home_button.addEventListener("click", e => {
    console.log("VENEZUELA");
    render_venezuela();
})
  
});

}

function toggle_highlight_large_unit(place_id) {

  map.setFilter(
    'large_units_border', [
      '==',
      ['get', 'code'],
      place_id
    ]
  );

}

function preenche_dados_card() {

  const textos = current_place_data.BASIC_INFO;

  const elementos_campos = document.querySelectorAll("#card [data-texto-card]");

  elementos_campos.forEach(el => {

    const campo = el.dataset.textoCard;

    let texto = textos[campo];
    texto = isNaN(+texto) ? texto : formata_numero(texto);

    el.innerHTML = texto;

  })

}

function atualiza_bread_crumb() {

  console.log(current_large_unit);

  btn_breadcrumb_large_unit.textContent = current_large_unit ?
    (" / " + current_large_unit) :
    ""
  ;

  btn_breadcrumb_small_unit.textContent = current_small_unit ?
    (" / " + current_small_unit) :
    ""
  ;

}

function formata_numero(texto) {

  return new Intl.NumberFormat('es-VE').format(texto); 


}

/* INTERACOES */

const btns_boxes = document.querySelector(".btn-box-wrapper");
const boxes = document.querySelector(".box");
const home_button = document.querySelector(".btn-breadcrumb-venezuela");
const btn_breadcrumb_large_unit = document.querySelector(".btn-breadcrumb-large-unit");
const btn_breadcrumb_small_unit = document.querySelector(".btn-breadcrumb-small-unit");

btns_boxes.addEventListener("click", e => {

  if (e.target.tagName != "BUTTON") return;

  const box_selecionado = e.target.dataset.btnBox;

  boxes.dataset.modoAtivo = box_selecionado;

  btns_boxes.querySelectorAll("button").forEach(btn => {
    btn.classList.remove("ativo");
  })

  e.target.classList.add("ativo");

})

function update_barra_classificacao() {

  const pcts = current_place_data.BASIC_INFO.CLASSIFICATION_PCT;

  const tipos = ["Desierto", "Semidesierto", "Semibosque", "Bosque"];

  tipos.forEach(tipo => {

    const barra = document.querySelector(`[data-distribuicao-classificacao="${tipo}"]`);

    barra.style.flexBasis = pcts[tipo] ? (pcts[tipo]*100 + "%") : 0;

  })

}


