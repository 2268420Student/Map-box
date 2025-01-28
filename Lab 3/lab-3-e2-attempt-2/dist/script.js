// The value for 'accessToken' begins with 'pk...'
mapboxgl.accessToken = "pk.eyJ1IjoiMjI2ODQyMHNjcmFpZyIsImEiOiJjbTV3Z2lka3gwYjQwMmxxeDF0bXZnMzJpIn0.y_ai08FBrglytHWiA-HAsQ";

const map = new mapboxgl.Map({
 container: 'map', // container element id
 style: 'mapbox://styles/mapbox/light-v10',
 center: [-0.089932, 51.514442],
 zoom: 14
});

const data_url = 
"https://api.mapbox.com/datasets/v1/2268420scraig/cm6gnhwtn9r0o1mrxs6531mjn/features?access_token=pk.eyJ1IjoiMjI2ODQyMHNjcmFpZyIsImEiOiJjbTV3Z2lka3gwYjQwMmxxeDF0bXZnMzJpIn0.y_ai08FBrglytHWiA-HAsQ";

map.on('load', () => {
 map.addLayer({
 id: 'crimes',
 type: 'circle',
 source: {
 type: 'geojson',
 data: data_url 
 },
 paint: {
 'circle-radius': 5,
 'circle-color': '#eb4d4b',
 'circle-opacity': 0.9
 }
 });
 
 //Slider interaction code goes below
10
 });