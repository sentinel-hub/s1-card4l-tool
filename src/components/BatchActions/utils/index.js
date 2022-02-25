import axios from 'axios';
import moment from 'moment';
import buffer from '@turf/buffer';
import bboxPolygon from '@turf/bbox-polygon';

import { CRS, DEFAULT_TEMPORAL_BUCKET, tilingGridToBuffer } from '../../../const';
import { transformGeometryToNewCrs } from '../../Map/utils';
import bbox from '@turf/bbox';
import { v4 as uuidv4 } from 'uuid';
import { buildExtraResultsDictionary, getDistinctDataTakes } from './getDistinctDatatake';
import store, { s1batchSlice } from '../../../store';
import { queuePromises } from '../../../lib/promiseQueue';

// IIFE to define the base url based on env variable.
export const BASE_BATCH_URL = (function () {
  return process.env.REACT_APP_ISPROD === 'FALSE'
    ? 'https://stage.sentinel-hub.com/api/v1/batch/process/'
    : 'https://services.sentinel-hub.com/api/v1/batch/process/';
})();

const filterFailedRequests = (responses) =>
  responses.filter((resp) => resp.status !== 'rejected').map((resp) => resp.value);

export const getConfigHelper = (token, reqConfig) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...reqConfig,
  };
  return config;
};

const getAllBatchRequestsHelper = (token, next, reqConfig) => {
  const config = getConfigHelper(token, reqConfig);
  let url = next ? next : BASE_BATCH_URL;
  return axios.get(url, config);
};

export const getAllBatchRequests = async (token, reqConfig) => {
  store.dispatch(s1batchSlice.actions.setExtraInfo('Fetching and grouping requests...'));
  let res = await getAllBatchRequestsHelper(token, undefined, reqConfig);
  let requests = res.data.data;
  while (res.data.links.next) {
    res = await getAllBatchRequestsHelper(token, res.data.links.next, reqConfig);
    requests = requests.concat(res.data.data);
  }
  return new Promise((resolve, reject) => {
    resolve({ data: { member: requests } });
  });
};

export const getCard4lRequest = async (token, card4lId, userId, reqConfig) => {
  let res = await getAllBatchRequestsHelper(
    token,
    `${BASE_BATCH_URL}?userId=${userId}&search=${card4lId}`,
    reqConfig,
  );
  let requests = res.data.data;
  while (res.data.links.next) {
    res = await getAllBatchRequestsHelper(token, res.data.links.next, reqConfig);
    requests = requests.concat(res.data.data);
  }
  return requests;
};

export const getSingleBatchRequest = (token, reqId, reqConfig) => {
  const config = getConfigHelper(token, reqConfig);
  const url = BASE_BATCH_URL + reqId;
  return axios.get(url, config);
};

const generateBounds = (state) => {
  //bbox
  if (state.geometry.length === 4) {
    return {
      bbox: transformGeometryToNewCrs(state.geometry, state.crs),
      properties: {
        crs: CRS[state.crs].url,
      },
    };
  } else if (state.geometry.type === 'Polygon' || state.geometry.type === 'MultiPolygon') {
    return {
      geometry: transformGeometryToNewCrs(state.geometry, state.crs),
      properties: {
        crs: CRS[state.crs].url,
      },
    };
  }
};

const getNonDefaultOptions = (options) => {
  const nonDefaultOptions = {};
  let keys = Object.keys(options);
  for (let key of keys) {
    if (options[key] !== 'DEFAULT') {
      nonDefaultOptions[key] = options[key];
    }
  }
  return nonDefaultOptions;
};

const getRequestData = (state) => {
  return [
    {
      type: 'S1GRD',
      dataFilter: {
        timeRange: {
          from: state.timeFrom,
          to: state.timeTo,
        },
        ...getNonDefaultOptions(state.dataFilterOptions),
      },
      processing: {
        ...getNonDefaultOptions(state.processingOptions),
      },
    },
  ];
};

const generateResponses = (responses) => {
  return responses
    .map((resp) => ({
      identifier: resp,
      format: {
        type: 'image/tiff',
      },
    }))
    .concat({
      identifier: 'userdata',
      format: {
        type: 'application/json',
      },
    });
};

const generateProcessRequest = (state) => {
  const processBody = {
    input: {
      bounds: {
        ...generateBounds(state),
      },
      data: getRequestData(state),
    },
    output: {
      responses: generateResponses(state.responses),
    },
    evalscript: state.evalscript,
  };
  return processBody;
};

const getTimeObjectFromDatatake = (datatake) => {
  const time = datatake.timeRange[0];
  const splitted = time.split('-');
  return {
    year: splitted[0],
    month: splitted[1],
    day: splitted[2].split('T')[0],
  };
};

const generateAdvancedOptions = (advancedOptions) => {
  if (advancedOptions.createCollection === true) {
    return {
      createCollection: true,
    };
  }

  return { collectionId: advancedOptions.collectionId };
};

export const generateBatchBodyRequest = (state, isSettingOutput, datatake, dateOrderString) => {
  const getDefaultTilePath = () => {
    const { year, month, day } = getTimeObjectFromDatatake(datatake);

    const bucketNameWithPrefix = (() => {
      if (isSettingOutput === true) {
        return state.advancedOptions.defaultTilePath;
      }
      if (state.isUsingTemporalBucket) {
        return `${DEFAULT_TEMPORAL_BUCKET}/${dateOrderString}`;
      }
      if (state.isUsingAutoPrefix) {
        return `${state.bucketName.split('/')[0]}/${dateOrderString}`;
      }
      return state.bucketName;
    })();

    return `s3://${bucketNameWithPrefix}/s1_rtc/<tileName>/${year}/${month}/${day}/${datatake.datatake}/s1_rtc_${datatake.datatake}_<tileName>_${year}_${month}_${day}_<outputId>.<format>`;
  };

  const processBody = generateProcessRequest(state);
  const batchRequest = {};
  batchRequest.processRequest = processBody;
  batchRequest.tilingGrid = {
    id: state.tilingGrid,
    resolution: state.resolution,
  };
  batchRequest.output = {
    cogOutput: true,
    defaultTilePath: getDefaultTilePath(),
  };

  if (state.overwrite === true) {
    batchRequest.output.overwrite = true;
  }

  if (isSettingOutput === true) {
    batchRequest.output = { ...batchRequest.output, ...generateAdvancedOptions(state.advancedOptions) };
  }

  if (state.description) {
    batchRequest.description = state.description;
  }

  return batchRequest;
};

export const getBatchBodyCreateWithDatatake = (state, datatake, uuid, dateOrderString) => {
  const body = generateBatchBodyRequest(
    state.s1odc,
    state.params.isSettingOutput || state.auth.isEdcUser,
    datatake,
    dateOrderString,
  );
  body.processRequest.input.data[0].dataFilter.timeRange.from = datatake.timeRange[0];
  body.processRequest.input.data[0].dataFilter.timeRange.to = datatake.timeRange[1];
  body.processRequest.input.bounds = { geometry: datatake.geometry };
  body.processRequest.input.bounds.properties = {
    crs: 'http://www.opengis.net/def/crs/EPSG/0/4326',
  };
  body.description = body.description ? body.description + ' card4lId: ' + uuid : 'card4lId: ' + uuid;
  return body;
};

const createBatchRequestWithDatatake = (state, token, datatake, uuid, dateOrderString, reqConfig) => {
  const config = getConfigHelper(token, reqConfig);
  const body = getBatchBodyCreateWithDatatake(state, datatake, uuid, dateOrderString);
  return axios.post(BASE_BATCH_URL, JSON.stringify(body), config);
};

const lazyCreateBatchRequestWithDatatake = (state, token, datatake, uuid, dateOrderString, reqConfig) => {
  const config = getConfigHelper(token, reqConfig);
  const body = getBatchBodyCreateWithDatatake(state, datatake, uuid, dateOrderString);
  return () => axios.post(BASE_BATCH_URL, JSON.stringify(body), config);
};

const lazyCreateAllBatchRequestsWithDatatake = (
  state,
  token,
  arrDatatakes,
  uuid,
  dateOrderString,
  reqConfig,
) => {
  return arrDatatakes.map((datatake) =>
    lazyCreateBatchRequestWithDatatake(state, token, datatake, uuid, dateOrderString, reqConfig),
  );
};

const analyseBatchRequest = (token, batchId, reqConfig) => {
  const url = BASE_BATCH_URL + batchId + '/analyse';
  const config = getConfigHelper(token, reqConfig);

  return axios.post(url, null, config);
};

const lazyAnalyseAllBatchRequests = (arrayOfIds, token, reqConfig) => {
  const promises = arrayOfIds.map((id) => () => analyseBatchRequest(token, id, reqConfig));
  return promises;
};

const retryTillAnalysisDone = async (token, batchId, reqConfig) => {
  let maxRetries = 120;
  let timeoutDelay = 15000;
  let initialRes = await getSingleBatchRequest(token, batchId, reqConfig);
  const recursiveHelper = (maxRetries, retries) => {
    if (retries >= maxRetries) {
      return new Promise((resolve, reject) => resolve(initialRes));
    }
    return new Promise(async (resolve, reject) => {
      try {
        let res = await getSingleBatchRequest(token, batchId, reqConfig);
        if (
          res.data &&
          (res.data.status === 'ANALYSIS_DONE' || res.data.status === 'DONE' || res.data.status === 'FAILED')
        ) {
          resolve(res);
        } else {
          setTimeout(async () => {
            resolve(recursiveHelper.call(this, maxRetries, retries + 1));
          }, timeoutDelay);
        }
      } catch (err) {
        if (axios.isCancel(err)) {
          resolve(initialRes);
        }
        //Rate limit - wait 10 seconds to retry
        else if (err.response && err.response.status === 429) {
          resolve(setTimeout(recursiveHelper.call(this, maxRetries, retries + 1), 10000));
        } else {
          reject(err);
        }
      }
    });
  };
  return recursiveHelper(maxRetries, 0);
};

const lazyCancelBatchRequest = (token, batchId, reqConfig) => {
  const url = BASE_BATCH_URL + batchId + '/cancel';
  const config = getConfigHelper(token, reqConfig);

  return () => axios.post(url, null, config);
};

export const cancelBatchRequests = async (token, ids, reqConfig) => {
  const lazyPromises = ids.map((id) => lazyCancelBatchRequest(token, id, reqConfig));
  const res = await queuePromises(lazyPromises, 100);

  const { rejected, fulfilled } = res.reduce(
    (acc, cv) => {
      if (cv.status === 'fulfilled') {
        acc['fulfilled'] = acc['fulfilled'] + 1;
      }
      if (cv.status === 'rejected') {
        acc['rejected'] = acc['rejected'] + 1;
      }
      return acc;
    },
    { rejected: 0, fulfilled: 0 },
  );
  return { rejected, fulfilled };
};

const startBatchRequest = (token, batchId, reqConfig) => {
  const config = getConfigHelper(token, reqConfig);
  const url = BASE_BATCH_URL + batchId + '/start';

  return axios.post(url, null, config);
};

const generateStartIdsPromiseGetter = (ids, token, reqConfig = {}) => {
  return ids.map((id) => () => startBatchRequest(token, id, reqConfig));
};

export const retryPartiallyFailedRequest = (token, batchId) => {
  const config = getConfigHelper(token);
  const url = BASE_BATCH_URL + batchId + '/restartpartial';

  return axios.post(url, null, config);
};

export const getLazyRestartPromises = (token, ids) => {
  return ids.map((req) => () => retryPartiallyFailedRequest(token, req));
};

const getStatus = (batchRequests) => {
  const DONE_LIKE_STATUS = ['PARTIAL', 'DONE', 'FAILED', 'CANCELED'];
  const PROCESSING_LIKE_STATUS = ['PROCESSING', 'ANALYSING', 'ANALYSIS_DONE'];
  let allDoneLike = true;
  let allProcessingLike = true;
  let allCanceled = true;
  let allDone = true;
  let allFailed = true;
  const statusList = batchRequests.map((br) => br.status);
  for (let status of statusList) {
    if (DONE_LIKE_STATUS.includes(status)) {
      allProcessingLike = false;
    }
    if (PROCESSING_LIKE_STATUS.includes(status)) {
      allDoneLike = false;
    }
    if (status !== 'CANCELED') {
      allCanceled = false;
    }
    if (status !== 'DONE') {
      allDone = false;
    }
    if (status !== 'FAILED') {
      allFailed = false;
    }
  }
  if (allDoneLike === false || allProcessingLike) {
    return 'PROCESSING';
  }
  if (allCanceled) {
    return 'CANCELED';
  }
  if (allDone) {
    return 'DONE';
  }
  if (allFailed) {
    return 'FAILED';
  }
  return 'PARTIAL';
};

export const mergeBatchResponses = (batchRequests) => {
  const [description, id] = batchRequests[0].description.split('card4lId: ');
  const status = getStatus(batchRequests);
  // change when estimated Pu are ok.
  // let totalPu;
  // if (status !== 'CREATED' || status !== 'FAILED' || status !== 'CANCELED') {
  //   totalPu = Math.round(
  //     batchRequests.reduce((acc, batchRequest) => acc + parseFloat(batchRequest.valueEstimate), 0),
  //   );
  // }
  let bucketName;
  try {
    bucketName = batchRequests[0].bucketName
      ? batchRequests[0].bucketName
      : batchRequests[0].output.defaultTilePath.split('/')[2];
  } catch (err) {
    bucketName = '<your-bucket>';
  }
  const tilePath = batchRequests[0].output?.defaultTilePath;
  return {
    description,
    id,
    status,
    // valueEstimate: totalPu,
    bucketName,
    created: batchRequests[0].created,
    batchRequests: batchRequests.map((br) => ({
      status: br.status,
      userAction: br.userAction,
      id: br.id,
      tileCount: br.tileCount,
    })),
    tilePath,
  };
};

// Create and analyse
const getBbox = (geometry) => {
  if (geometry.length === 4) {
    return geometry;
  }
  return bbox(geometry);
};

const getCatalogQuery = (dataFilterOptions) => {
  let res = {};
  if (dataFilterOptions.acquisitionMode && dataFilterOptions.acquisitionMode !== 'DEFAULT') {
    res['sar:instrument_mode'] = {
      eq: dataFilterOptions.acquisitionMode,
    };
  }
  if (dataFilterOptions.orbitDirection && dataFilterOptions.orbitDirection !== 'DEFAULT') {
    res['sat:orbit_state'] = {
      eq: dataFilterOptions.orbitDirection,
    };
  }
  if (dataFilterOptions.resolution && dataFilterOptions.resolution !== 'DEFAULT') {
    res['resolution'] = {
      eq: dataFilterOptions.resolution,
    };
  }
  if (dataFilterOptions.polarization && dataFilterOptions.polarization !== 'DEFAULT') {
    res['polarization'] = {
      eq: dataFilterOptions.polarization,
    };
  }
  return res;
};

const getCatalogBodyWithoutGeometry = (s1odcState) => {
  const from = moment.utc(s1odcState.timeFrom).subtract('2', 'minutes');
  const to = moment.utc(s1odcState.timeTo).add('2', 'minutes');
  //Always present params
  const body = {
    datetime: from.format() + '/' + to.format(),
    collections: ['sentinel-1-grd'],
    limit: 100,
    query: getCatalogQuery(s1odcState.dataFilterOptions),
    fields: {
      include: [
        'geometry',
        'bbox',
        'properties.datetime',
        'id',
        'properties.sar:instrument_mode',
        'properties.polarization',
      ],
      exclude: ['assets'],
    },
  };
  return body;
};

export const catalogRequest = (state, next, reqConfig) => {
  const { s1odc } = state;
  const url = 'https://services.sentinel-hub.com/api/v1/catalog/search';
  const body = getCatalogBodyWithoutGeometry(s1odc);
  if (next) {
    body.next = next;
  }
  //Polygon or multipolygon
  if (s1odc.geometry.type) {
    body.intersects = {
      ...s1odc.geometry,
    };
  } else {
    body.bbox = getBbox(s1odc.geometry);
  }
  const config = getConfigHelper(state.auth.user.access_token, reqConfig);
  return axios.post(url, body, config);
};

const bufferedCatalogRequest = async (state, reqConfig) => {
  const appropiateStateGeo =
    state.s1odc.geometry.length === 4 ? bboxPolygon(state.s1odc.geometry).geometry : state.s1odc.geometry;
  const { value, units } = tilingGridToBuffer(state.s1odc.tilingGrid);
  const bufferedGeometry = buffer(appropiateStateGeo, value, {
    units,
  }).geometry;
  const geoWithHole = {
    type: 'MultiPolygon',
    coordinates: [appropiateStateGeo.coordinates, bufferedGeometry.coordinates],
  };
  const makeRequest = async () => {
    const body = getCatalogBodyWithoutGeometry(state.s1odc);
    body.intersects = {
      ...geoWithHole,
    };
    const config = getConfigHelper(state.auth.user.access_token, reqConfig);
    const url = 'https://services.sentinel-hub.com/api/v1/catalog/search';
    let res = await axios.post(url, body, config);
    let extraFeatures = res.data.features;
    while (res.data.context?.next) {
      body.next = res.data.context.next;
      res = await axios.post(url, body, config);
      extraFeatures = extraFeatures.concat(res.data.features);
    }
    return extraFeatures;
  };

  return makeRequest();
};

export const searchAndAnalyse = async (state, reqConfig) => {
  try {
    store.dispatch(
      s1batchSlice.actions.setExtraInfo("Searching for data. Don't reload or close the window."),
    );
    let catalogResponse = await catalogRequest(state, undefined, reqConfig);
    let catalogFeatures = catalogResponse.data.features;
    while (catalogResponse.data.context.next) {
      catalogResponse = await catalogRequest(state, catalogResponse.data.context.next, reqConfig);
      catalogFeatures = catalogFeatures.concat(catalogResponse.data.features);
    }
    const extraResults = (await bufferedCatalogRequest(state)).filter(
      (feature) => !catalogFeatures.find((feat) => feat.id === feature.id),
    );
    store.dispatch(s1batchSlice.actions.setExtraInfo("Analysing data. Don't reload or close the window."));
    const extraResultsDictionary = buildExtraResultsDictionary(extraResults);
    const { distinctDataTakes, failedDatatakes } = getDistinctDataTakes(
      catalogFeatures,
      extraResultsDictionary,
      state.s1odc.geometry,
      [state.s1odc.timeFrom, state.s1odc.timeTo],
      state.s1odc.dataFilterOptions.acquisitionMode,
      state.s1odc.dataFilterOptions.polarization,
      state.s1odc.mission,
    );

    return new Promise((resolve, reject) => {
      resolve({ data: { distinctDataTakes, failedDatatakes } });
    });
  } catch (err) {
    console.error(err);
    return Promise.reject({
      errorMessage: 'Something went wrong while analysing the data, check the console for more details.',
    });
  }
};

const createAndAnalyseRequest = async (state, token, datatake, uuid, dateOrderString, reqConfig) => {
  try {
    store.dispatch(
      s1batchSlice.actions.setExtraInfo("Creating first request. Don't reload or close the window."),
    );
    const createResponse = await createBatchRequestWithDatatake(
      state,
      token,
      datatake,
      uuid,
      dateOrderString,
      reqConfig,
    );
    let id = createResponse.data.id;
    store.dispatch(
      s1batchSlice.actions.setExtraInfo(
        "Waiting for analysis of the first request to finish. Don't reload or close the window.",
      ),
    );
    await analyseBatchRequest(token, id);
    const analyseResponse = await retryTillAnalysisDone(token, id, reqConfig);
    if (analyseResponse.data.status === 'ANALYSIS_DONE' && analyseResponse.data.error === undefined) {
      return { isValid: true, firstRes: createResponse };
    }
    return { isValid: false, firstRes: analyseResponse };
  } catch (error) {
    console.error(error);
    return { isValid: false, firstRes: error };
  }
};

const getfulfilledAndRejected = (xs, resp) => {
  return resp.reduce(
    (acc, cv, idx) => {
      if (cv.status === 'fulfilled') {
        acc['fulfilled'].push(xs[idx]);
      } else if (cv.status === 'rejected') {
        acc['rejected'].push(xs[idx]);
      }
      return acc;
    },
    { rejected: [], fulfilled: [] },
  );
};

export const createAll = async (state, datatakes, reqConfig) => {
  const token = state.auth.user.access_token;
  const uuid = uuidv4();
  const dateOrderString = `order_${moment.utc().format()}`;
  // Wait for analysis on the first request to see if it's correct. To avoid creating a lot of failed requests.
  const { isValid, firstRes } = await createAndAnalyseRequest(
    state,
    token,
    datatakes[0],
    uuid,
    dateOrderString,
    reqConfig,
  ); // {isValid : bool, firstRes:response}
  if (!isValid) {
    let errorMessage = 'Invalid Request';
    if (firstRes.data && firstRes.data.error) {
      errorMessage = firstRes.data.error;
    }
    return new Promise((resolve, reject) => {
      reject({ errorMessage });
    });
  }
  const createBatchRequestsLazyPromises = lazyCreateAllBatchRequestsWithDatatake(
    state,
    token,
    datatakes.slice(1),
    uuid,
    dateOrderString,
    reqConfig,
  );
  store.dispatch(
    s1batchSlice.actions.setExtraInfo("Creating Batch Requests. Don't reload or close the window."),
  );
  let res = await queuePromises(createBatchRequestsLazyPromises, 100);
  // Add the first created response to the list of created responses.
  res.unshift({
    status: 'fulfilled',
    value: firstRes,
  });

  return res.reduce(
    (acc, cv, idx) => {
      if (cv.status === 'fulfilled') {
        acc['fulfilled'].push(cv.value.data);
      } else if (cv.status === 'rejected') {
        acc['rejected'].push(datatakes[idx]);
      }
      return acc;
    },
    { rejected: [], fulfilled: [] },
  );
};

export const startAll = async (ids, token, reqConfig) => {
  const proms = generateStartIdsPromiseGetter(ids, token, reqConfig);
  store.dispatch(
    s1batchSlice.actions.setExtraInfo("Starting Batch Requests. Don't reload or close the window."),
  );
  const resp = await queuePromises(proms, 100);
  const { rejected, fulfilled } = resp.reduce(
    (acc, cv, idx) => {
      if (cv.status === 'fulfilled') {
        acc['fulfilled'].push(ids[idx]);
      } else if (cv.status === 'rejected') {
        acc['rejected'].push(ids[idx]);
      }
      return acc;
    },
    { rejected: [], fulfilled: [] },
  );
  return { rejected, fulfilled };
};

export const deleteAll = async (ids, token, reqConfig) => {
  const config = getConfigHelper(token, reqConfig);
  const proms = ids.map((id) => () => axios.delete(`${BASE_BATCH_URL}${id}`, config));
  const res = await queuePromises(proms, 200);
  const { fulfilled, rejected } = getfulfilledAndRejected(ids, res);
  store.dispatch(
    s1batchSlice.actions.setExtraInfo(
      `${fulfilled.length} requests deleted. ${rejected.length} failed while trying to delete.`,
    ),
  );
  return { fulfilled, rejected };
};

// export const createAndStart = async (state, datatakes, reqConfig) => {
//   const token = state.auth.user.access_token;
//   let extraMessage = '';
//   let res = createAll(state, datatakes, reqConfig);
//   const createdResponses = filterFailedRequests(res);
//   if (createdResponses.length !== res.length) {
//     extraMessage += ` ${
//       res.length - createdResponses.length
//     } Create Requests failed. Check the console for more details.`;
//   }
//   let ids = createdResponses.map((resp) => resp.data.id);
//   const { rejected } = await startAll(ids, token, reqConfig);
//   if (rejected.length > 0) {
//     extraMessage += ` ${
//       ids.length - rejected.length
//     } Start Requests failed. Check the console for more details`;
//   }
//   store.dispatch(
//     s1batchSlice.actions.setExtraInfo(`${res.length} requests successfully started.` + extraMessage),
//   );
//   return new Promise((resolve, reject) => {
//     resolve({ data: createdResponses });
//   });
// };

// DEBUG requests
// create and analyse all.
export const createAndAnalyseAll = async (state, datatakes, reqConfig) => {
  const token = state.auth.user.access_token;
  const uuid = uuidv4();
  let extraMessage = '';
  const dateOrderString = `order_${moment.utc().format()}`;
  // Wait for analysis on the first request to see if it's correct. To avoid creating a lot of failed requests.
  const { isValid, firstRes } = await createAndAnalyseRequest(
    state,
    token,
    datatakes[0],
    uuid,
    dateOrderString,
    reqConfig,
  ); // {isValid : bool, firstRes:response}
  if (!isValid) {
    let errorMessage = 'Invalid Request';
    if (firstRes.data && firstRes.data.error) {
      errorMessage = firstRes.data.error;
    }
    return new Promise((resolve, reject) => {
      reject({ errorMessage });
    });
  }
  const createBatchRequestsLazyPromises = lazyCreateAllBatchRequestsWithDatatake(
    state,
    token,
    datatakes.slice(1),
    uuid,
    dateOrderString,
    reqConfig,
  );
  store.dispatch(
    s1batchSlice.actions.setExtraInfo("Creating Batch Requests. Don't reload or close the window."),
  );
  let res = await queuePromises(createBatchRequestsLazyPromises, 100);
  const createdResponses = filterFailedRequests(res);
  if (createdResponses.length !== createBatchRequestsLazyPromises.length) {
    extraMessage += ` ${
      createBatchRequestsLazyPromises.length - createdResponses.length
    } Create Requests failed. Check the console for more details.`;
  }
  // Add the first created response to the list of created responses.
  createdResponses.unshift(firstRes);
  let ids = createdResponses.map((resp) => resp.data.id);

  const analysePromises = lazyAnalyseAllBatchRequests(ids, token, reqConfig);
  store.dispatch(
    s1batchSlice.actions.setExtraInfo(
      "Analaysing all Batch Requests. Don't reload or close the window." + extraMessage,
    ),
  );
  res = await queuePromises(analysePromises, 100);
  res = filterFailedRequests(res);
  if (res.length !== analysePromises.length) {
    extraMessage += ` ${
      analysePromises.length - res.length
    } Analyse Requests failed. Check the console for more details`;
  }
  store.dispatch(
    s1batchSlice.actions.setExtraInfo(`${res.length} requests successfully analysed.` + extraMessage),
  );
  return new Promise((resolve, reject) => {
    resolve({ data: createdResponses });
  });
};
