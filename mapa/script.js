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

let data;

fetch("../geo/output/data.json").then(response => response.json()).then(data_ => init(data_));

function init(data_) {

  data = data_;

  const colors_codes = {
    Bosque: "#657034",
    Desierto: "#b26d36",
    Semidesierto: "#d4ba99",
    Semibosque: "#e0d579"
};

  const colors = {};
  data.small_units.forEach(small_unit => {

    colors[small_unit.BASIC_INFO.LEVEL_2_CODE] = colors_codes[small_unit.BASIC_INFO.CLASSIFICATION];

  })

  color_map = Object.entries(colors).flat();

  console.log(colors);

  init_map(data);

}

function init_map() {

  // já preenche os dados da Venezuela no card
  const country_data = data.country[0];
  preenche_dados_card(country_data);

  console.log(color_map);

  map.on('load', () => {

  map.fitBounds([-73.3911486, 0.6493155, -56.4818190, 15.7029483] , {
    padding: 50,
    duration: 0
  });

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
  });

  map.addSource('large-units', {
      'type': 'vector',
      'url': 'mapbox://tiagombp.l4n4rlnd4xsh',
      'promoteId' : 'code'
  });

  /* camadas das small units */
/*
  map.addLayer({
    'id': 'small_units_fill',
    'type': 'fill',
    'source': 'venezuela',
    'source-layer': "628134755d56856f760c",
    'paint': {
        'fill-color' :
          [
              'match',
              ['to-string', ['get', 'code']],
              ...color_map,
              'transparent'
          ],
        'fill-outline-color' : 'black'
    }
  });
*/

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
          'line-color' : 'black',
          'line-opacity': [
            'case',
            [
                'boolean', 
                ['feature-state', 'hover'], 
                false
            ],
            1,
            0
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
    
    const place_id = e.features[0].properties.code;

    //last_provincia_location_data = place_data;

    // limpa o hover state featureState

    // não teria que setar o provinciaHoveredId para null?
    provinciaHoveredId = null;

    map.setFeatureState(
        { 
          source: 'large-units',
          sourceLayer: "e6ce5cc1dd5b09147e8a",
          id: provinciaHoveredId
        },

        { hover : false }
    );

    render_large_unit(place_id);

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
  function render_large_unit(place_id) {

    // pega os dados    
    const place_data = data.large_units.filter(d => d.BASIC_INFO.LEVEL_1_CODE == place_id)[0];
    console.log(place_data);

    // coloca a borda
    toggle_highlight_large_unit(place_id);

    // desabilita os eventos de provincia
    toggle_events_large_units("off");

    // preenche os campos de texto do card
    preenche_dados_card(place_data);

  }
  
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

function preenche_dados_card(place_data) {

  const textos = place_data.BASIC_INFO;

  const elementos_campos = document.querySelectorAll("#card [data-texto-card]");

  elementos_campos.forEach(el => {

    const campo = el.dataset.textoCard;

    let texto = textos[campo];
    texto = isNaN(+texto) ? texto : formata_numero(texto);

    el.innerHTML = texto;

  })

}

function formata_numero(texto) {

  return new Intl.NumberFormat('es-VE').format(texto); 


}



