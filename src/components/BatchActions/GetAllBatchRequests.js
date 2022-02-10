import React, { useCallback } from 'react';
import RequestButton from '../RequestButton/RequestButton';
import { getAllBatchRequests } from './utils';
import { connect } from 'react-redux';
import store, { s1batchSlice } from '../../store';
import { getCard4lRequests, isCard4lRequest, getCard4lId } from './GetLatestBatchRequest';
import { mergeBatchResponses } from './utils';
import Axios from 'axios';

const errorHandler = (err) => {
  if (Axios.isCancel(err)) {
    store.dispatch(s1batchSlice.actions.setExtraInfo('Request cancelled'));
  } else {
    store.dispatch(s1batchSlice.actions.setExtraInfo('Something went wrong, check the console'));
    console.error(err);
  }
};

export const getCard4lIds = (requests) => {
  const ids = [];
  for (let req of requests) {
    if (isCard4lRequest(req)) {
      let id = getCard4lId(req);
      let alreadyIn = ids.find((oneId) => id === oneId);
      if (!alreadyIn) {
        ids.push(id);
      }
    }
  }
  return ids;
};

const GetAllBatchRequests = ({ token, setDatatakes }) => {
  const handleGetAllRequests = useCallback(
    (response) => {
      const requests = response.member.sort((b, a) => new Date(a.created) - new Date(b.created));
      const listOfCard4lIds = getCard4lIds(requests);
      if (listOfCard4lIds.length > 0) {
        const result = [];
        listOfCard4lIds.forEach((id) => {
          let card4lRequests = getCard4lRequests(requests, id);
          let merged = mergeBatchResponses(card4lRequests);
          result.push(merged);
        });
        store.dispatch(s1batchSlice.actions.setFetchedBatchRequests(result));
      }
      //reset extra info.
      store.dispatch(s1batchSlice.actions.setExtraInfo(''));
      store.dispatch(s1batchSlice.actions.setCatalogAnalyseInfo({}));
      setDatatakes([]);
    },
    [setDatatakes],
  );

  return (
    <div>
      <RequestButton
        buttonText="Get all your requests"
        request={getAllBatchRequests}
        args={[token]}
        validation={Boolean(token)}
        className="secondary-button"
        responseHandler={handleGetAllRequests}
        errorHandler={errorHandler}
        disabledTitle="Log in to use this"
      />
    </div>
  );
};

export default connect((store) => ({ token: store.auth.user.access_token }))(GetAllBatchRequests);
