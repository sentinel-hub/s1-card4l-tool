import Axios from 'axios';

import { getConfigHelper, BASE_BATCH_URL } from '../../BatchActions/utils';

// Iterates through all tiles for each batch request and counts relevant info.
export const getTileInfo = (listOfTiles) => {
  let res = {
    processedTiles: 0,
    scheduledTiles: 0,
    consumedPu: 0,
    totalTiles: 0,
    pendingTiles: 0,
    failedTiles: 0,
  };
  const failedRequests = [];
  const partialRequests = [];
  const doneReqs = [];
  let notYetStarted = 0;

  for (let tiles of listOfTiles) {
    if (tiles.length === 0) {
      notYetStarted++;
      continue;
    }
    const iniAcc = {
      processedTiles: 0,
      scheduledTiles: 0,
      consumedPu: 0,
      totalTiles: 0,
      pendingTiles: 0,
      failedTiles: 0,
    };
    const current = tiles.reduce((acc, tile) => {
      if (tile.status === 'PROCESSED') {
        acc['processedTiles']++;
        acc['consumedPu'] += tile.cost / 3;
      }
      if (tile.status === 'PENDING') {
        acc['pendingTiles']++;
      }
      if (tile.status === 'SCHEDULED') {
        acc['scheduledTiles']++;
      }
      if (tile.status === 'FAILED') {
        acc['failedTiles']++;
      }
      acc['totalTiles']++;
      return acc;
    }, iniAcc);

    // set failed and partial requests to display them later.
    if (tiles.length > 0) {
      if (current['failedTiles'] === tiles.length) {
        failedRequests.push(tiles[0].requestId);
      } else if (
        current['failedTiles'] > 0 &&
        current['processedTiles'] > 0 &&
        current['failedTiles'] + current['processedTiles'] === tiles.length
      ) {
        partialRequests.push(tiles[0].requestId);
      }
      if (current['processedTiles'] === tiles.length) {
        doneReqs.push({ id: tiles[0].requestId, tileCount: tiles.length });
      }
    }

    res['processedTiles'] += current['processedTiles'];
    res['scheduledTiles'] += current['scheduledTiles'];
    res['consumedPu'] += current['consumedPu'];
    res['totalTiles'] += current['totalTiles'];
    res['pendingTiles'] += current['pendingTiles'];
    res['failedTiles'] += current['failedTiles'];
  }
  return { tiles: res, failedRequests, partialRequests, notYetStarted, doneReqs };
};

// Check if it's relevant to retrieve the tiles.
export const validStatus = (status) => {
  return Boolean(status !== 'CREATED' && status !== 'CANCELED');
};

export const getStatusByTiles = (tiles) => {
  if (tiles.totalTiles > 0) {
    if (tiles.processedTiles === tiles.totalTiles) {
      return 'DONE';
    } else if (tiles.failedTiles === tiles.totalTiles0) {
      return 'FAILED';
    } else if (tiles.pendingTiles + tiles.scheduledTiles > 0) {
      return 'PROCESSING';
    } else {
      return 'PARTIAL';
    }
  }
};

const fetchTilesBatchRequest = async (id, token, reqConfig) => {
  const config = getConfigHelper(token, reqConfig);
  config.maxRetries = 5;

  const fetchTilesHelper = async (next = undefined) => {
    const BASE_URL = `${BASE_BATCH_URL}${id}/tiles`;
    const url = next ? next : BASE_URL;
    let res = await Axios.get(url, config);
    return res.data;
  };
  let res = await fetchTilesHelper();
  let tiles = res.data ?? [];
  while (res.links.next) {
    res = await fetchTilesHelper(res.links.next);
    tiles = tiles.concat(res.data);
  }
  return new Promise((resolve, reject) => {
    resolve(tiles);
  });
};

export const getFetchTilesPromises = (batchIds, token, reqConfig) => {
  return batchIds.map((id) => () => fetchTilesBatchRequest(id, token, reqConfig));
};

// string -> string
export const generateCopyCommand = (tilePath) => {
  // Request with date
  if (tilePath.includes('order_')) {
    return tilePath.split('/').slice(0, 4).join('/') + '/';
  }
  if (tilePath.includes('s1_nrb')) {
    return tilePath.split('<tileName>')[0];
  }
  return tilePath.split('/').slice(0, 4).join('/') + '/';
};

export const getDoneTileCount = (doneReqs) => doneReqs.reduce((acc, doneReq) => acc + doneReq.tileCount, 0);
