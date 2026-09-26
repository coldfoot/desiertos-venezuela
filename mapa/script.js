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

fetch("../geo/output/data.json").then(response => response.json()).then(data => init(data));

function init(data) {
  console.log(data);

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

  init_map();

}

function init_map() {

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

  /* handlers */

  function mouse_enter_handler_large(e) {
    
    map.getCanvas().style.cursor = 'pointer';

    const place_id = e.features[0].properties.code;

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

  /* inicia handlers */
  map.on('mousemove', 'large_units_hover', mouse_enter_handler_large);
  map.on('mouseleave', 'large_units_hover', mouse_leave_handler_large);

});

}

