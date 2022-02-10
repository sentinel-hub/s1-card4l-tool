import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map from './Map';
import { connect } from 'react-redux';
import { CRS } from '../../const';
import store, { s1batchSlice } from '../../store';
import { appendPolygon, transformGeometryToNewCrs, transformGeometryToWGS84IfNeeded } from './utils';
import L from 'leaflet';
import bboxPolygon from '@turf/bbox-polygon';
import bbox from '@turf/bbox';
import { kml } from '@tmcw/togeojson';
import Tooltip from '../Tooltip/Tooltip';
import Select from '../Select';
//Helper functions.
const containsCrs = (parsedGeometry) => parsedGeometry.properties?.crs !== undefined;
const isFeatureCollection = (parsedGeometry) => parsedGeometry.type === 'FeatureCollection';
const isFeature = (parsedGeometry) => parsedGeometry.type === 'Feature';
const isGeojson = (parsedGeometry) =>
  isFeatureCollection(parsedGeometry) || isFeature(parsedGeometry) === 'Feature';
const crsByUrl = (url) => Object.keys(CRS).find((key) => CRS[key].url === url);
const getCrsUrl = (parsedGeometry) => parsedGeometry.properties.crs;
const getFeatureCollectionMultiPolygon = (featureCollection) => {
  const { features } = featureCollection;
  let currentGeo = features[0].geometry;
  for (let feature of features.slice(1)) {
    currentGeo = appendPolygon(currentGeo, feature.geometry);
  }
  return currentGeo;
};
//from parsed geometry to leaflet polygon / layer.
const getLayer = (parsedGeometry, layerConfig, currentLayers, mapRef) => {
  const addEditEventListener = (layer, layerConfig) => {
    if (layerConfig) {
      return;
    }
    layer.on('pm:edit', (e) => {
      const layer = e.layer;
      const type = currentLayers[0].type;
      if (type === 'rectangle') {
        store.dispatch(s1batchSlice.actions.setGeometry(bbox(layer.toGeoJSON())));
      } else if (type === 'polygon') {
        store.dispatch(s1batchSlice.actions.setGeometry(layer.toGeoJSON().geometry));
      }
    });
  };
  try {
    if (parsedGeometry.type === 'Polygon') {
      const coords = parsedGeometry.coordinates[0].map((c) => [c[1], c[0]]);
      const polygon = L.polygon(coords, layerConfig);
      addEditEventListener(polygon, layerConfig);
      return {
        layer: polygon,
        type: 'polygon',
      };
    } else if (parsedGeometry.type === 'MultiPolygon') {
      const coords = parsedGeometry.coordinates.map((a) =>
        a.map((coords) => coords).map((b) => b.map((c) => [c[1], c[0]])),
      );
      const layer = L.polygon(coords, layerConfig);
      addEditEventListener(layer, layerConfig);
      return {
        layer: layer,
        type: 'polygon',
      };
    } else {
      const coords = bboxPolygon(parsedGeometry).geometry.coordinates[0].map((c) => [c[1], c[0]]);
      const polygon = L.rectangle(coords, layerConfig);
      addEditEventListener(polygon, layerConfig);
      return {
        layer: polygon,
        type: 'rectangle',
      };
    }
  } catch (err) {
    console.error('error while creating the layer on GetLayer\n', err);
    return false;
  }
};

const generateCRSOptions = (crs) =>
  Object.keys(crs)
    .map((key) =>
      !crs[key].internal
        ? {
            name: key,
            value: key,
          }
        : undefined,
    )
    .filter((o) => o);

const convertToCRS84AndDispatch = (parsedGeo, selectedCrs, setGeometryText) => {
  const transformedGeo = transformGeometryToWGS84IfNeeded(selectedCrs, parsedGeo);
  if (transformedGeo) {
    store.dispatch(s1batchSlice.actions.setGeometry(transformedGeo));
  } else {
    setGeometryText();
  }
};

//Component
const MapContainer = ({ geometry, selectedCrs, isOnDebugMode, extraGeometry = undefined }) => {
  //functions for leaflet map.
  const deleteLayerIfPossible = () => {
    if (layersRef.current.length > 0) {
      const layerToBeRemoved = layersRef.current.pop().layer;
      drawnItemsRef.current.removeLayer(layerToBeRemoved);
      mapRef.current.removeLayer(layerToBeRemoved);
    }
  };

  const addDrawLayer = (layerWithType) => {
    const { layer, type } = layerWithType;
    if (layer && type) {
      drawnItemsRef.current.addLayer(layer);
      layersRef.current.push(layerWithType);
    } else {
      throw Error('Adding invalid layer');
    }
  };

  // Helpers for TPDI layers
  const deleteAllExtraLayersIfPossible = () => {
    if (extraLayersRef.current.length > 0) {
      while (extraLayersRef.current.length > 0) {
        const layerToBeRemoved = extraLayersRef.current.pop().layer;
        drawnItemsRef.current.removeLayer(layerToBeRemoved);
        mapRef.current.removeLayer(layerToBeRemoved);
      }
    }
  };

  const addExtraDrawLayer = (layerWithType) => {
    const { layer, type } = layerWithType;
    if (layer && type) {
      drawnItemsRef.current.addLayer(layer);
      extraLayersRef.current.push(layerWithType);
    } else {
      throw Error('Adding invalid layer');
    }
  };

  const [geometryText, setGeometryText] = useState('');
  const layersRef = useRef([]);
  //reference to layers no-related to redux geometry (tpdi)
  const extraLayersRef = useRef([]);
  const drawnItemsRef = useRef();
  const mapRef = useRef();

  const handleCRSChange = (value) => {
    store.dispatch(s1batchSlice.actions.setCrs(value));
  };

  const handleGeometryTextChange = (e) => {
    setGeometryText(e.target.value);
  };

  const setStateGeometryText = useCallback(() => {
    setGeometryText(JSON.stringify(geometry, null, 2));
  }, [geometry]);

  // Parses geometry on textarea to layers on leaflet.
  // 1. Create leaflet layer based on geo 2. add it to drawn items 3. Fit Bounds to the new layer.
  const parseProperGeometryToMap = useCallback((parsedGeometry) => {
    try {
      const leafletLayer = getLayer(parsedGeometry, undefined, layersRef.current, mapRef.current);
      deleteLayerIfPossible();
      addDrawLayer(leafletLayer);
      mapRef.current.fitBounds(leafletLayer.layer.getBounds());
    } catch (err) {
      console.error('Parsing geometry failed', err);
    }
  }, []);

  const parseExtraGeometryToMap = useCallback((parsedGeometry) => {
    try {
      const leafletLayer = getLayer(
        parsedGeometry,
        { color: 'green' },
        extraLayersRef.current,
        mapRef.current,
      );
      addExtraDrawLayer(leafletLayer);
    } catch (err) {
      console.error('Parsing extra geometry failed', err);
    }
  }, []);

  const handleParseGeometry = (text = geometryText) => {
    try {
      let parsedGeo = JSON.parse(text);
      // Geojson
      let usedCrs = selectedCrs;
      if (isGeojson) {
        if (containsCrs(parsedGeo)) {
          const newCrs = crsByUrl(getCrsUrl(parsedGeo));
          if (newCrs) {
            store.dispatch(s1batchSlice.actions.setCrs(newCrs));
            usedCrs = newCrs;
          } else {
            throw Error('CRS not supported');
          }
        }
        if (isFeatureCollection(parsedGeo)) {
          const multiPolygon = getFeatureCollectionMultiPolygon(parsedGeo);
          parsedGeo = multiPolygon;
        }
        if (isFeature(parsedGeo)) {
          parsedGeo = parsedGeo.geometry;
        }
      }
      convertToCRS84AndDispatch(parsedGeo, usedCrs, setStateGeometryText);
    } catch (err) {
      // addWarningAlert('Error parsing the geometry');
      console.error('Error Parsing Geometry', err);
    }
  };

  //Effect that handles transforming into the selected CRS the internal geometry and keeping the textarea updated.
  useEffect(() => {
    if (selectedCrs !== 'EPSG:4326') {
      const transformedGeo = transformGeometryToNewCrs(geometry, selectedCrs);
      setGeometryText(JSON.stringify(transformedGeo, null, 2));
    } else {
      setGeometryText(JSON.stringify(geometry, null, 2));
    }
  }, [geometry, selectedCrs]);

  // Effect that converts internal geometry to Leaflet Layers visible on the Map.
  useEffect(() => {
    parseProperGeometryToMap(geometry);
  }, [geometry, parseProperGeometryToMap]);

  // Effect that shows extra geometry layers (for tpdi)
  useEffect(() => {
    if (extraGeometry) {
      parseExtraGeometryToMap(extraGeometry);
    }
  }, [extraGeometry, parseExtraGeometryToMap]);

  useEffect(() => {
    if (extraGeometry === null) {
      deleteAllExtraLayersIfPossible();
    }
  }, [extraGeometry]);

  const handleUploadFileButtonClick = () => {
    let fileElement = document.getElementById('file-input');
    fileElement.click();
  };

  const handleFileUpload = async () => {
    try {
      let fileElement = document.getElementById('file-input');
      let file = fileElement.files[0];
      let text = await file.text();
      let ext = file.name.split('.').pop();
      if (file.type.includes('kml') || ext === 'kml') {
        let parser = new DOMParser();
        let doc = parser.parseFromString(text, 'text/xml');
        let converted = kml(doc);
        convertToCRS84AndDispatch(converted.features[0].geometry, selectedCrs, setStateGeometryText);
      } else {
        handleParseGeometry(text);
      }
      fileElement.value = '';
    } catch (err) {
      console.error('Error uploading file', err);
    }
  };

  return (
    <div className="aoi-container">
      <h2 className="heading-secondary">Area of interest</h2>
      <div className="form">
        <div className="mb-2 flex items-center w-52">
          <label className="form__label mr-2">CRS</label>
          <Select
            options={generateCRSOptions(CRS)}
            selected={selectedCrs}
            onChange={handleCRSChange}
            optionsClassNames="z-50"
          />
        </div>
        <div className="map-container">
          <Map mapRef={mapRef} drawnItemsRef={drawnItemsRef} layersRef={layersRef} />
          <div className="flex flex-col items-center h-auto ml-4 lg:w-2/5">
            <textarea
              onChange={handleGeometryTextChange}
              value={geometryText}
              spellCheck="false"
              className="p-3 mb-2 h-full w-full outline-none focus:border-2 focus:border-primary rounded-md"
            />
            <div className="flex items-center w-full">
              <button onClick={() => handleParseGeometry()} className="secondary-button mr-2">
                Parse Geometry
              </button>
              <input onChange={handleFileUpload} id="file-input" type="file" style={{ display: 'none' }} />
              <button
                title="Upload a KML or GeoJSON file to parse the geometry."
                onClick={handleUploadFileButtonClick}
                className="secondary-button mr-2"
              >
                Upload KML/GeoJSON
              </button>
              <Tooltip
                content="Upload a KML or GeoJSON file to parse the geometry (Only first geometry on the file gets parsed)."
                direction="bottom"
              />
              {isOnDebugMode && extraGeometry !== null && (
                <button
                  className="secondary-button"
                  onClick={() => {
                    store.dispatch(s1batchSlice.actions.setExtraGeometry(null));
                  }}
                >
                  Clear extra geometry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  geometry: state.s1odc.geometry,
  extraGeometry: state.s1odc.extraGeometry,
  selectedCrs: state.s1odc.crs,
  isOnDebugMode: state.params.debugMode,
});

export default connect(mapStateToProps)(MapContainer);
