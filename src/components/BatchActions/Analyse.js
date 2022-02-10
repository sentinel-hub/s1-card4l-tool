import React, { useCallback } from 'react';
import RequestButton from '../RequestButton/RequestButton';
import { searchAndAnalyse, mergeBatchResponses, createAndAnalyseAll } from './utils';
import { connect } from 'react-redux';
import store, { s1batchSlice } from '../../store';
import { getNumberOfDatatakes, getDifferentDates, getTotalArea } from './utils/infoFromDatatakes';
import Axios from 'axios';
import CreateAndStartContainer from './CreateAll';

const errorHandler = (e) => {
  let errorMessage = 'Something went wrong';
  if (Axios.isCancel(e)) {
    errorMessage = 'Request Cancelled';
  } else if (e && e.errorMessage) {
    errorMessage = e.errorMessage;
  } else {
    console.error(e);
  }
  store.dispatch(s1batchSlice.actions.setExtraInfo(errorMessage));
};

export const validateAccountType = (user, isEdcUser) => {
  const { userdata, access_token } = user;
  if (isEdcUser) {
    return true;
  }
  if (!userdata || !access_token) {
    return false;
  }
  const accountType = userdata?.d && userdata.d['1']?.t;
  return access_token && accountType && accountType >= 14000;
};

const Analyse = ({ state, setDatatakes, datatakes }) => {
  const isOnDebugMode = state.params.debugMode;
  const getDatatakesResponseHandler = useCallback(
    (response) => {
      const { distinctDataTakes, failedDatatakes } = response;
      const amountDatatakes = getNumberOfDatatakes(distinctDataTakes);
      const distinctDates = getDifferentDates(distinctDataTakes);
      const totalArea = getTotalArea(distinctDataTakes);
      store.dispatch(
        s1batchSlice.actions.setCatalogAnalyseInfo({
          totalArea,
          distinctDates,
          amountDatatakes,
          failedDatatakes,
        }),
      );
      if (amountDatatakes === 0) {
        store.dispatch(s1batchSlice.actions.setExtraInfo('No datatakes found with the current query'));
      } else {
        store.dispatch(s1batchSlice.actions.setExtraInfo(''));
      }
      store.dispatch(s1batchSlice.actions.setFetchedBatchRequests([]));
      setDatatakes(distinctDataTakes);
    },
    [setDatatakes],
  );

  const confirmOrdersResponseHandler = useCallback(
    (response) => {
      const requests = response.map((req) => req.data);
      const single = mergeBatchResponses(requests);
      single.status = 'PROCESSING';
      store.dispatch(s1batchSlice.actions.setCatalogAnalyseInfo({}));
      store.dispatch(s1batchSlice.actions.setFetchedBatchRequests([single]));
      store.dispatch(s1batchSlice.actions.setExtraInfo(''));
      setDatatakes([]);
    },
    [setDatatakes],
  );
  return (
    <>
      {datatakes.length === 0 ? (
        <RequestButton
          buttonText="Search And Analyse"
          request={searchAndAnalyse}
          args={[state]}
          validation={validateAccountType(state.auth.user, state.auth.isEdcUser)}
          className="secondary-button mr-2"
          responseHandler={getDatatakesResponseHandler}
          errorHandler={errorHandler}
          disabledTitle="Log in to use this"
          maxRetries={5}
        />
      ) : (
        <CreateAndStartContainer datatakes={datatakes} setDatatakes={setDatatakes} state={state} />
      )}

      {isOnDebugMode && datatakes.length > 0 && (
        <RequestButton
          buttonText="Analyse All"
          request={createAndAnalyseAll}
          args={[state, datatakes]}
          validation={true}
          className="secondary-button mr-2"
          responseHandler={confirmOrdersResponseHandler}
          errorHandler={errorHandler}
        />
      )}
    </>
  );
};

export default connect((state) => ({ state }))(Analyse);
