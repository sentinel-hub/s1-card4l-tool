import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Axios from 'axios';
import { connect } from 'react-redux';

import { getCard4lRequest, mergeBatchResponses } from '../../BatchActions/utils';
import { numberWithSeparator } from './../CatalogInfo';
import CancelBatchRequest from '../../BatchActions/CancelBatchRequest';
import RestartPartially from '../../BatchActions/RestartPartially';
import { DEFAULT_TEMPORAL_BUCKET } from '../../../const';
import { queuePromises } from '../../../lib/promiseQueue';
import { StartAll } from '../../BatchActions/CreateAll';
import store, { s1batchSlice } from '../../../store';
import {
  getTileInfo,
  validStatus,
  getStatusByTiles,
  getFetchTilesPromises,
  generateCopyCommand,
  getDoneTileCount,
} from './utils';

const BatchRequestSummary = ({ request, token, fetchedRequests, isOnDebugMode, userId }) => {
  const {
    id,
    status,
    description,
    created,
    // valueEstimate,
    batchRequests,
    bucketName,
    tilePath,
  } = request;

  const batchRequestIds = batchRequests.map((br) => br.id);
  // If there's only one fetched request expand it automatically.
  const [showAllInfo, setShowAllInfo] = useState(() => {
    if (fetchedRequests.length === 1) {
      return true;
    }
    return false;
  });
  const [fetchedTiles, setFetchedTiles] = useState({
    processedTiles: 0,
    scheduledTiles: 0,
    consumedPu: 0,
    totalTiles: 0,
    pendingTiles: 0,
    failedTiles: 0,
  });
  const [isFetchingTiles, setIsFetchingTiles] = useState(false);
  const [statusState, setStatus] = useState(() => {
    return status;
  });
  const [failedRequests, setFailedRequests] = useState([]);
  const [partialRequests, setPartialRequests] = useState([]);
  const [doneRequests, setDoneRequests] = useState(() => {
    return request.batchRequests
      .filter((br) => br.status === 'DONE')
      .map((br) => ({ id: br.id, tileCount: br.tileCount }));
  });
  const [notYetStarted, setNotYetStarted] = useState(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const sourceRef = useRef();

  const fetchTiles = useCallback(async () => {
    sourceRef.current = Axios.CancelToken.source();
    const reqConfig = {
      cancelToken: sourceRef.current.token,
    };
    setIsFetchingTiles(true);

    // skip already DONE requests
    const doneIds = doneRequests.map((r) => r.id);
    const filteredBatchReqsIds = batchRequestIds.filter((id) => !doneIds.includes(id));
    const promFns = getFetchTilesPromises(filteredBatchReqsIds, token, reqConfig);
    let responses = [];
    try {
      responses = await queuePromises(promFns, 100);
    } catch (error) {
      if (!Axios.isCancel(error)) {
        throw error;
      }
    }
    const tilesResp = responses.map((resp) => resp.value).filter((a) => a);
    const { tiles, failedRequests, partialRequests, notYetStarted, doneReqs } = getTileInfo(tilesResp);
    const doneTileCount = getDoneTileCount(doneRequests);
    const withAlreadyProcessedTiles = {
      ...tiles,
      processedTiles: tiles.processedTiles + doneTileCount,
      totalTiles: tiles.totalTiles + doneTileCount,
    };
    setFailedRequests(failedRequests);
    setPartialRequests(partialRequests);
    setFetchedTiles(withAlreadyProcessedTiles);
    setIsFetchingTiles(false);
    setNotYetStarted(notYetStarted);
    setDoneRequests((prev) => [...prev, ...doneReqs]);
    // update status depending on tiles response.
    setStatus(getStatusByTiles(withAlreadyProcessedTiles));
  }, [batchRequestIds, token, doneRequests]);

  useEffect(() => {
    if (showAllInfo && validStatus(statusState)) {
      fetchTiles();
    }
    // eslint-disable-next-line
  }, []);

  // Effect to automatically show all info if only one fetched batch request.
  useEffect(() => {
    if (fetchedRequests.length === 1) {
      setShowAllInfo(true);
    }
  }, [fetchedRequests.length]);

  const handleShowInfoClick = () => {
    if (showAllInfo === false && validStatus(statusState)) {
      fetchTiles();
    }
    if (showAllInfo === true && isFetchingTiles) {
      if (sourceRef.current) {
        sourceRef.current.cancel();
      }
    }
    setShowAllInfo(!showAllInfo);
  };

  const handleShowRequests = () => {
    console.log(batchRequests);
  };

  const requestsToResume = useMemo(() => batchRequests.filter((br) => br.userAction === 'CREATED'), [
    batchRequests,
  ]);

  const handleRefreshOrder = async () => {
    setIsUpdatingStatus(true);
    const requests = await getCard4lRequest(token, id, userId, {});
    const request = mergeBatchResponses(requests);
    if (statusState !== request.status) {
      setStatus(request.status);
    }
    store.dispatch(s1batchSlice.actions.updateFetchedRequest({ request, id }));
    setIsUpdatingStatus(false);
  };

  return (
    <>
      <div className="flex items-center w-full">
        <div
          title="Click to show information about the request"
          onClick={handleShowInfoClick}
          className="w-full h-full flex items-center cursor-pointer py-2 justify-between font-bold"
        >
          <p className="text" style={{ display: 'inline-block' }}>
            {id} - {showAllInfo ? 'Click to hide' : 'Click to expand'}
          </p>
          <p className="text mr-10">{statusState}</p>
        </div>
      </div>

      {showAllInfo ? (
        <>
          {!validStatus(statusState) ? null : isFetchingTiles ? (
            <p className="text" style={{ minHeight: '150px' }}>
              Loading...
            </p>
          ) : (
            <table summary="Tile Information" className="catalog-info-table">
              <caption>
                Tile Information
                <button onClick={fetchTiles} className="secondary-button ml-2">
                  Refresh Tiles
                </button>
              </caption>
              <thead>
                <tr>
                  <th scope="col">Processed</th>
                  <th scope="col">Scheduled</th>
                  <th scope="col">Failed</th>
                  <th scope="col">Pending</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{numberWithSeparator(fetchedTiles.processedTiles)}</td>
                  <td>{numberWithSeparator(fetchedTiles.scheduledTiles)}</td>
                  <td>{numberWithSeparator(fetchedTiles.failedTiles)}</td>
                  <td>{numberWithSeparator(fetchedTiles.pendingTiles)}</td>
                  <td>{numberWithSeparator(fetchedTiles.totalTiles)}</td>
                </tr>
              </tbody>
            </table>
          )}
          {isUpdatingStatus ? (
            <p className="text mt-2 mb-3">Loading...</p>
          ) : (
            <table summary="Request Group Summary" className="catalog-info-table">
              <caption>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <p style={{ marginRight: '1rem' }}>Request Group Summary</p>
                  <span
                    style={{ cursor: 'pointer' }}
                    title="Refresh all batch requests contained in the order"
                    onClick={handleRefreshOrder}
                  >
                    &#8635;
                  </span>
                </div>
              </caption>
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  {description ? <th scope="col">Description</th> : null}
                  <th scope="col">Creation Date</th>
                  {fetchedTiles.consumedPu ? <th scope="col">Consumed PU</th> : null}
                  <th scope="col">Amount of Batch Requests</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td onClick={handleShowRequests}>{statusState}</td>
                  {description ? <td>{description}</td> : null}
                  <td>{created}</td>
                  {fetchedTiles.consumedPu ? (
                    <td>{numberWithSeparator(Math.round(fetchedTiles.consumedPu))}</td>
                  ) : null}
                  <td>{batchRequestIds.length}</td>
                </tr>
              </tbody>
            </table>
          )}

          {failedRequests.length > 0 &&
            failedRequests.map((req) => (
              <p key={`failed-${req}`} className="text text--warning">
                Batch Request: {req} FAILED and CANNOT be restarted.
              </p>
            ))}

          {partialRequests.length > 0 &&
            partialRequests.map((req) => (
              <p key={`partial-${req}`} className="text text--warning">
                Batch Request: <span>{req}</span> failed PARTIALLY and CAN be restarted.
              </p>
            ))}

          {notYetStarted > 0 && (
            <p className="text text--warning">
              {notYetStarted} requests are not yet started, so the tiles table may not be definitive.
              <br />
              Refresh tiles in a few minutes to see the proper data.
            </p>
          )}

          <div className="flex items-center mb-3">
            <CancelBatchRequest ids={batchRequestIds} />
            <RestartPartially ids={batchRequestIds} card4lId={id} />
            {isOnDebugMode && <StartAll createdRequests={batchRequests} token={token} isResuming={true} />}
            {requestsToResume.length > 0 && (
              <StartAll createdRequests={requestsToResume} token={token} isResuming={true} />
            )}
          </div>

          {tilePath && (
            <>
              <p className="text">
                <i>Note: To copy produced data to your location, you can use the following command:</i>
              </p>
              <p className="text mt-1 ml-1 mb-3">
                &gt;&nbsp; aws s3 sync {generateCopyCommand(tilePath)} ./{' '}
                {bucketName === DEFAULT_TEMPORAL_BUCKET ? '--request-payer' : ''}
              </p>
            </>
          )}

          <p className="text mb-3">Expected file count: {batchRequests.length * 6 + batchRequests.length}</p>
        </>
      ) : null}

      <hr></hr>
    </>
  );
};

const mapStateToProps = (state) => ({
  token: state.auth.user.access_token,
  userId: state.auth.user?.userdata?.sub,
  fetchedRequests: state.s1odc.fetchedBatchRequests,
  isOnDebugMode: state.params.debugMode,
});

export default connect(mapStateToProps)(BatchRequestSummary);
