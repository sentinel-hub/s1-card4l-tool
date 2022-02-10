import bboxPolygon from '@turf/bbox-polygon';
import proj4 from 'proj4';
import { CRS } from '../../../const';
import bbox from '@turf/bbox';
import area from '@turf/area';

const isValidType = (geometry) =>
  geometry.type === 'Polygon' || geometry.length === 4 || geometry.type === 'MultiPolygon';

const isValidGeometry = (geometry) =>
  isValidType(geometry) && geometry.coordinates?.length && geometry.coordinates[0].length !== undefined;

// Parsed Geo in whatever CRS -> Parsed Geo in WGS84
export const transformGeometryToWGS84IfNeeded = (selectedCRS, geometry) => {
  if (!isValidGeometry(geometry)) {
    return;
  }
  //transform if not in WGS84
  if (selectedCRS !== 'EPSG:4326') {
    try {
      const newGeo = transformGeometryToNewCrs(geometry, 'EPSG:4326', selectedCRS);
      return newGeo;
    } catch (err) {
      return geometry;
    }
  }
  return geometry;
};

export const getAreaFromGeometry = (geometry) => {
  if (geometry.length === 4) {
    return area(bboxPolygon(geometry));
  } else {
    return area(geometry);
  }
};

//parsed Geometry -> parsed geo in newCRS
export const transformGeometryToNewCrs = (geometry, toCrs, fromCrs) => {
  try {
    if (!fromCrs) {
      fromCrs = 'EPSG:4326';
    }
    //bbox
    if (geometry.length === 4) {
      return transformBboxToNewCrs(geometry, CRS[toCrs].projection, CRS[fromCrs].projection);
    }
    //polygon
    else if (geometry.type === 'Polygon') {
      return transformPolygonToNewCrs(geometry, CRS[toCrs].projection, CRS[fromCrs].projection);
    } else if (geometry.type === 'MultiPolygon') {
      return transformMultiPolygonToNewCrs(geometry, CRS[toCrs].projection, CRS[fromCrs].projection);
    }
  } catch (err) {
    console.error('Invalid geometry', err);
  }
};

const getCoordsFromBbox = (bbox) => {
  if (bbox.length !== 4) {
    throw Error('Not valid bbox');
  }
  const polygonFromBbox = bboxPolygon(bbox);
  return polygonFromBbox.geometry.coordinates;
};

//cords [[[x,y],[x,y]]]
const transformArrayOfCoordinatesToNewCrs = (coords, toProj, fromProj) => {
  return [coords[0].map((c) => proj4(fromProj, toProj, c))];
};

export const transformBboxToNewCrs = (bboxToTransform, toProj, fromProj) => {
  const bboxCoords = getCoordsFromBbox(bboxToTransform);
  const transformedCoords = transformArrayOfCoordinatesToNewCrs(bboxCoords, toProj, fromProj);
  const polygon = {
    type: 'Polygon',
    coordinates: transformedCoords,
  };
  return bbox(polygon);
};

export const transformPolygonToNewCrs = (polygonToTransform, toProj, fromProj) => {
  const transformedCoords = transformArrayOfCoordinatesToNewCrs(
    polygonToTransform.coordinates,
    toProj,
    fromProj,
  );
  const polygon = {
    type: 'Polygon',
    coordinates: transformedCoords,
  };
  return polygon;
};

const transformCoordMultiPolygon = (coords, toProj, fromProj) =>
  coords.map((polyCoords) =>
    polyCoords.map((listOfPairs) => listOfPairs.map((c) => proj4(fromProj, toProj, c))),
  );

const transformMultiPolygonToNewCrs = (multiPolygon, toProj, fromProj) => {
  const transformedCoords = transformCoordMultiPolygon(multiPolygon.coordinates, toProj, fromProj);
  const resultMultiPolygon = {
    type: 'MultiPolygon',
    coordinates: transformedCoords,
  };
  return resultMultiPolygon;
};

const isPolygon = (geo) => geo.type === 'Polygon';

export const appendPolygon = (currentGeometry, newPolygon) => {
  if (isPolygon(currentGeometry)) {
    return {
      type: 'MultiPolygon',
      coordinates: [currentGeometry.coordinates, newPolygon.coordinates],
    };
  }
  // multiPolygon
  if (isPolygon(newPolygon)) {
    return {
      type: 'MultiPolygon',
      coordinates: currentGeometry.coordinates.concat([newPolygon.coordinates]),
    };
  }
  return {
    type: 'MultiPolygon',
    coordinates: currentGeometry.coordinates.concat(newPolygon.coordinates),
  };
};
