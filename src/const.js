import proj4 from 'proj4';
import { evalscriptByResponses } from './constEvalscripts';

export const DEFAULT_EVALSCRIPT = evalscriptByResponses(['VV', 'VH']);

export const DEFAULT_BUCKET_NAME = '';
export const DEFAULT_TEMPORAL_BUCKET = 'sh.s1-card4l.eu-central-1.nasa';

export const DATASOURCES = {
  S1GRD: {
    url: 'https://services.sentinel-hub.com/api/v1/process',
    ogcUrl: 'https://services.sentinel-hub.com/ogc/',
  },
};

export const DEFAULT_EVALSCRIPTS = {
  S1GRD: DEFAULT_EVALSCRIPT,
};

export const S1GRD = 'S1GRD';

export const CRS = {
  'EPSG:3857': {
    url: 'http://www.opengis.net/def/crs/EPSG/0/3857',
    projection: proj4('EPSG:3857'),
    internal: false,
  },
  'EPSG:4326': {
    url: 'http://www.opengis.net/def/crs/EPSG/0/4326',
    projection: proj4('EPSG:4326'),
    internal: false,
  },
  'EPSG:32633': {
    url: 'http://www.opengis.net/def/crs/EPSG/0/32633',
    projection: '+proj=utm +zone=33 +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
    internal: true,
  },
  'EPSG:32645': {
    url: 'http://www.opengis.net/def/crs/EPSG/0/32645',
    projection: '+proj=utm +zone=45 +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
    internal: true,
  },
};

export const tilingGridToBuffer = (tilingGridId) => {
  switch (tilingGridId) {
    case 0:
      return { value: 30, units: 'kilometers' };
    case 1:
      return { value: 15, units: 'kilometers' };
    case 2:
      return { value: 150, units: 'kilometers' };
    case 3:
      return { value: 1.5, units: 'degrees' };
    default:
      return { value: 50, units: 'kilometers' };
  }
};
