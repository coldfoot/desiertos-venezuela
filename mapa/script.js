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

  map.addSource('venezuela', {
      'type': 'vector',
      'url': 'mapbox://tiagombp.rzef2q0scjuf',
      'promoteId' : 'code'
  });

  /* camadas das small units */

  map.addLayer({
    'id': 'small_units_fill',
    'type': 'fill',
    'source': 'venezuela',
    'source-layer': "628134755d56856f760c",
    'paint': {
        'fill-color' : 'hotpink',
        'fill-outline-color' : 'black'
    }
  });

  /* camadas das large units */

  map.addLayer({
      'id': 'large_units_border',
      'type': 'line',
      'source': 'venezuela',
      'source-layer': "e6ce5cc1dd5b09147e8a",
      'paint': {
          'line-color' : 'black',
          'line-width' : 2
      }
  });


});
