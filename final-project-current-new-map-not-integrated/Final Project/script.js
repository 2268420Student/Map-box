mapboxgl.accessToken =
  "pk.eyJ1IjoiMjI2ODQyMHNjcmFpZyIsImEiOiJjbTV3Z2lka3gwYjQwMmxxeDF0bXZnMzJpIn0.y_ai08FBrglytHWiA-HAsQ";

// Define map styles
const styles = {
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  light: "mapbox://styles/mapbox/outdoors-v12"
};

// Initialize the map
const map = new mapboxgl.Map({
  container: "map",
  style: styles.satellite,
  center: [-4.5, 57.5],
  zoom: 5
});

// ✅ Fix: Ensure layers are reloaded when switching styles
document.getElementById("styleToggle").addEventListener("change", function () {
  const selectedStyle = this.value;
  map.setStyle(styles[selectedStyle]);

  map.once("style.load", () => {
    console.log("New style loaded! Re-adding layers.");

    // ✅ Re-add sources and layers
    map.addSource("monuments", {
      type: "vector",
      url: "mapbox://2268420scraig.4miqt2zl"
    });

    addMonumentLayer();

    siteTypes.forEach((siteType) => {
      addHeatmapLayer(siteType);
      map.setLayoutProperty(`heatmap-${siteType}`, "visibility", "none");
    });

    addSearchBars();
    populateSiteSearch();
    addLegend();
    setupCheckboxFiltering();
    setupHeatmapToggle();
  }); // ✅ Missing closing brace added here
});

// Site types for heatmaps
const siteTypes = [
  "Causewayed Enclosure",
  "Chambered Cairn",
  "Cursus",
  "Henge",
  "Long Barrow",
  "Palisaded Enclosure",
  "Stone Circle"
];

// 🔹 Load map and layers on initial load
map.on("load", () => {
  console.log("Map loaded!");

  // ✅ Set the terrain using Mapbox's elevation data
  map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

  // ✅ Add the raster digital elevation model (DEM) source
  map.addSource("mapbox-dem", {
    type: "raster-dem",
    url: "mapbox://mapbox.mapbox-terrain-dem-v1", // Official Mapbox terrain DEM
    tileSize: 512,
    maxzoom: 14
  });

  // ✅ Add a hillshade layer for better visibility of terrain
  map.addLayer({
    id: "hillshade",
    type: "hillshade",
    source: "mapbox-dem",
    layout: { visibility: "visible" },
    paint: {
      "hillshade-shadow-color": "#3d2b1f", // Dark brown shadows
      "hillshade-highlight-color": "#f4e1c1", // Light parchment highlights
      "hillshade-exaggeration": 1.2 // Slightly increased exaggeration
    }
  });

  // ✅ Re-add all other layers after terrain is applied
  map.addSource("monuments", {
    type: "vector",
    url: "mapbox://2268420scraig.4miqt2zl"
  });

  addMonumentLayer();

  // Add heatmaps & ensure they are hidden at first
  siteTypes.forEach((siteType) => {
    addHeatmapLayer(siteType);
    map.setLayoutProperty(`heatmap-${siteType}`, "visibility", "none");
  });

  addSearchBars();
  populateSiteSearch();
  addLegend();
  setupCheckboxFiltering();
  setupHeatmapToggle();
});

// 🔹 Function to add monument points
function addMonumentLayer() {
  if (!map.getLayer("monuments-layer")) {
    map.addLayer({
      id: "monuments-layer",
      type: "circle",
      source: "monuments",
      "source-layer": "Combined_monument_wgs84-cuxigq",
      paint: {
        "circle-radius": 3,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#000000",
        "circle-color": [
          "match",
          ["get", "SITE_TYPE"],
          "Causewayed Enclosure",
          "#ff0000", // Red
          "Chambered Cairn",
          "#00ff00", // Green
          "Cursus",
          "#0000ff", // Blue
          "Henge",
          "#ff9900", // Orange
          "Long Barrow",
          "#9900ff", // Purple
          "Palisaded Enclosure",
          "#00ffff", // Cyan
          "Stone Circle",
          "#808080", // Grey
          "#808080" // Default to grey for safety
        ]
      }
    });
  }
}

// 🔹 Function to add a heatmap for a specific site type
function addHeatmapLayer(siteType) {
  if (!map.getLayer(`heatmap-${siteType}`)) {
    map.addLayer({
      id: `heatmap-${siteType}`,
      type: "heatmap",
      source: "monuments",
      "source-layer": "Combined_monument_wgs84-cuxigq",
      maxzoom: 15,
      filter: ["==", ["get", "SITE_TYPE"], siteType],
      paint: {
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 2, 15, 6],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 15, 15, 50],
        "heatmap-opacity": 0.9,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(0, 0, 255, 0)",
          0.2,
          "rgb(0, 255, 255)",
          0.4,
          "rgb(0, 255, 0)",
          0.6,
          "rgb(255, 255, 0)",
          0.8,
          "rgb(255, 165, 0)",
          1,
          "rgb(255, 0, 0)"
        ]
      }
    });
  }
}

// 🔹 Function to add search bars
function addSearchBars() {
  if (!document.getElementById("geocoderContainer")) {
    const searchContainer = document.createElement("div");
    searchContainer.innerHTML = `
      <label for="siteSearch"><strong>Search for a Site:</strong></label>
      <input type="text" id="siteSearch" placeholder="Start typing..." list="siteList" />
      <datalist id="siteList"></datalist>
      <label for="geocoder"><strong>Search for a Location:</strong></label>
      <div id="geocoderContainer"></div>
    `;
    document.getElementById("console").appendChild(searchContainer);

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: false,
      placeholder: "Search locations..."
    });
    document
      .getElementById("geocoderContainer")
      .appendChild(geocoder.onAdd(map));
  }
}

// 🔹 Function to populate the site search bar
function populateSiteSearch() {
  const siteList = document.getElementById("siteList");

  if (!siteList) {
    console.warn("Datalist element not found!");
    return;
  }

  const siteData = {};

  map.on("idle", () => {
    const features = map.querySourceFeatures("monuments", {
      sourceLayer: "Combined_monument_wgs84-cuxigq"
    });

    features.forEach((feature) => {
      const siteName = feature.properties.SITE_NAME;
      const coordinates = feature.geometry.coordinates;

      if (siteName && coordinates) {
        siteData[siteName] = coordinates;
      }
    });

    siteList.innerHTML = "";
    Object.keys(siteData).forEach((site) => {
      let option = document.createElement("option");
      option.value = site;
      siteList.appendChild(option);
    });
  });

  document.getElementById("siteSearch").addEventListener("change", function () {
    const siteName = this.value;

    if (siteData[siteName]) {
      const [lng, lat] = siteData[siteName];

      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        essential: true
      });
    } else {
      alert("Site not found!");
    }
  });
}

// 🔹 Checkbox Filtering
function setupCheckboxFiltering() {
  document.getElementById("filters").addEventListener("change", () => {
    const selectedTypes = Array.from(
      document.querySelectorAll("#filters input:checked")
    ).map((checkbox) => checkbox.value);

    let filterType = selectedTypes.length
      ? [
          "any",
          ...selectedTypes.map((type) => ["==", ["get", "SITE_TYPE"], type])
        ]
      : ["has", "SITE_TYPE"];

    if (map.getLayer("monuments-layer")) {
      map.setFilter("monuments-layer", filterType);
    }
  });
}

// 🔹 Heatmap Toggle
function setupHeatmapToggle() {
  document.querySelectorAll('input[name="heatmap"]').forEach((radio) => {
    radio.addEventListener("change", (event) => {
      const selectedType = event.target.value;

      siteTypes.forEach((siteType) => {
        if (map.getLayer(`heatmap-${siteType}`)) {
          map.setLayoutProperty(`heatmap-${siteType}`, "visibility", "none");
        }
      });

      if (selectedType !== "none") {
        map.setLayoutProperty(
          `heatmap-${selectedType}`,
          "visibility",
          "visible"
        );
      }
    });
  });
}

map.on("click", (event) => {
  // Get the clicked feature (monument)
  const features = map.queryRenderedFeatures(event.point, {
    layers: ["monuments-layer"] // Ensure this matches your layer ID
  });

  if (!features.length) {
    return;
  }

  const feature = features[0];

  // Extracting properties
  const siteName = feature.properties.SITE_NAME || "Unknown";
  const siteType = feature.properties.SITE_TYPE || "Unknown Type";
  const siteURL = feature.properties.URL || "#"; // Ensure the dataset includes a URL field

  // Create a popup
  const popup = new mapboxgl.Popup({ offset: [0, -15], className: "my-popup" })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(
      `<h3>${siteName}</h3>
      <p><strong>Type:</strong> ${siteType}</p>
      <p><a href="${siteURL}" target="_blank">More Info</a></p>`
    )
    .addTo(map);
});
// 🔹 Function to Add Legend
function addLegend() {
  let legend = document.getElementById("legend");

  // If legend does not exist, create it inside the sidebar
  if (!legend) {
    legend = document.createElement("div");
    legend.id = "legend";
    legend.className = "legend";
    document.getElementById("console").appendChild(legend);
  }

  // Clear existing legend items
  legend.innerHTML = `<strong>Legend</strong><br>`;

  // Define category colors
  const categories = {
    "Causewayed Enclosure": "#ff0000",
    "Chambered Cairn": "#00ff00",
    Cursus: "#0000ff",
    Henge: "#ff9900",
    "Long Barrow": "#9900ff",
    "Palisaded Enclosure": "#00ffff",
    "Stone Circle": "#808080" // Updated category instead of "Other/Unknown"
  };

  // Loop through categories to generate legend items
  for (const [key, color] of Object.entries(categories)) {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-color" style="background-color: ${color};"></span>${key}`;
    legend.appendChild(item);
  }
}

// 🔹 Toggle Monument Type Filters Visibility
document
  .getElementById("monument-toggle")
  .addEventListener("click", function () {
    const filters = document.getElementById("filters");

    if (filters.style.display === "none" || filters.style.display === "") {
      filters.style.display = "block";
      this.innerHTML = "<strong>Monument Type ▼</strong>"; // Down arrow when open
    } else {
      filters.style.display = "none";
      this.innerHTML = "<strong>Monument Type ▶</strong>"; // Right arrow when collapsed
    }
  });

// 🔹 Toggle Heatmap Filters Visibility (NEW!)
document
  .getElementById("heatmap-toggle-header")
  .addEventListener("click", function () {
    const heatmapOptions = document.getElementById("heatmap-options");

    if (
      heatmapOptions.style.display === "none" ||
      heatmapOptions.style.display === ""
    ) {
      heatmapOptions.style.display = "block";
      this.innerHTML = "<strong>Heatmaps ▼</strong>"; // Down arrow when open
    } else {
      heatmapOptions.style.display = "none";
      this.innerHTML = "<strong>Heatmaps ▶</strong>"; // Right arrow when collapsed
    }
  });

// 🔹 Add Buttons Below Legend
const buttonContainer = document.createElement("div");
buttonContainer.className = "popup-buttons";

const infoButton = document.createElement("button");
infoButton.className = "popup-button";
infoButton.innerText = "Info";
infoButton.onclick = () => openModal("infoModal");

const worksheetButton = document.createElement("button");
worksheetButton.className = "popup-button";
worksheetButton.innerText = "Worksheet";
worksheetButton.onclick = () => openModal("worksheetModal");

buttonContainer.appendChild(infoButton);
buttonContainer.appendChild(worksheetButton);
document.body.appendChild(buttonContainer);

// 🔹 Create Popups
const modalHTML = `
  <div id="infoModal" class="modal">
    <div class="modal-content">
      <span class="close-button" onclick="closeModal('infoModal')">&times;</span>
      <h2>Information</h2>
      <p>Hello! Welcome to this interactive web map exploring monuments of the Neolithic found in Scotland. Through your course you have been exploring the exciting changes that were part of the Neolithic agricultural revolution, the move from a hunter-gatherer based economy to a farming one. This change allowed for surplus food supplies, a larger labour force, more specialised roles in society, and a more stratified society.</p>
 <p>One of the ways these changes manifest is the production of monuments, many of which are still visible as ruins today or have been uncovered by archaeologists.  These are grouped into recognisable types; you can explore the definitions of these by clicking the links below –</p>
<a href="https://canmore.org.uk/thesaurus/1/1527/CAUSEWAYED%20ENCLOSURE" target="_blank">Causewayed Enclosure</a>

<a href="https://canmore.org.uk/thesaurus/1/1488/CHAMBERED%20CAIRN" target="_blank">Chambered Cairn</a>

<a href="https://canmore.org.uk/thesaurus/1/1663/CURSUS" target="_blank">Cursus</a>

<a href="https://canmore.org.uk/thesaurus/1/1730/HENGE" target="_blank">Henge</a>
<a href="https://canmore.org.uk/thesaurus/1/1670/LONG%20BARROW" target="_blank">Long Barrow</a>
<a
href="https://canmore.org.uk/thesaurus/1/324/PALISADED%20ENCLOSURE" target="_blank">Palisaded Enclosure</a>
<a
href="https://canmore.org.uk/thesaurus/1/1771/STONE%20CIRCLE" target="_blank">Stone Circle</a>

<p>In this exercise you will use this interactive web map to explore where these different monument types are found in Scotland and answer various questions from the worksheet provided based on your observations. Below is a quick explanation of some of these features.</p>
<p><strong>Monument types</strong> – Located in the sidebar. Use these checkbox buttons to add or remove markers which represent the different monument types on the map. The colours representing each site are show in the legend in the top right of the screen</p>
<p><strong>Map style</strong> – Located in the sidebar. Use this to switch between satellite imagery background map and a more stylised one that emphasises topography</p>
<p><strong>Heatmaps</strong> – Use these to display heatmaps corresponding to the different map types, visualising concentrated areas of certain monument types</p>
<p><strong>Search bars</strong> - Located in the sidebar. Use these to either search for a specific site you know, or to search for a more general area in Scotland</p>
<p><strong>Map controls</strong> – Located on the bottom left of the screen. Use these to zoom and to return to your current location</p>
 
    </div>
  </div>
  
  <div id="worksheetModal" class="modal">
    <div class="modal-content">
      <span class="close-button" onclick="closeModal('worksheetModal')">&times;</span>
      <h2>Worksheet</h2>
      <p>Placeholder for Worksheet content. You can replace this with worksheet details.</p>
    </div>
  </div>
`;

document.body.insertAdjacentHTML("beforeend", modalHTML);

// ✅ Function to Open Full-Screen Modal Popups
function openModal(id) {
  document.getElementById(id).style.display = "flex";
}

// ✅ Function to Close Popups
function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

// ✅ Ensure Clicking Outside Closes the Modal
document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", function (event) {
    if (event.target === this) closeModal(this.id);
  });
});

// ✅ Assign Click Events to Buttons
document.getElementById("info-button").addEventListener("click", function () {
  openModal("infoModal");
});

document
  .getElementById("worksheet-button")
  .addEventListener("click", function () {
    openModal("worksheetModal");
  });

// 🔹 Add Map Controls (Navigation & Geolocation)
map.addControl(new mapboxgl.NavigationControl(), "bottom-left");

map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true
  }),
  "bottom-left"
);