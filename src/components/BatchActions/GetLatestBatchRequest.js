import React, { useCallback } from 'react';
import RequestButton from '../RequestButton/RequestButton';
import { getAllBatchRequests } from './utils';
import { connect } from 'react-redux';
import store, { s1batchSlice } from '../../store';
import { mergeBatchResponses } from './utils';
import Axios from 'axios';
import { getCard4lIds } from './GetAllBatchRequests';
import { filterCrashedRequests } from '../BatchInfo/BatchInfo';

const errorHandler = (err) => {
  if (Axios.isCancel(err)) {
    store.dispatch(s1batchSlice.actions.setExtraInfo('Request cancelled'));
  } else {
    store.dispatch(s1batchSlice.actions.setExtraInfo('Something went wrong, check the console'));
    console.error(err);
  }
};

export const isCard4lRequest = (request) =>
  Boolean(request.description && request.description.includes('card4lId: '));
export const getCard4lId = (request) => {
  return request.description.split('card4lId: ')[1];
};

//id is card4l id.
export const getCard4lRequests = (requests, id) => {
  return requests.filter((req) => {
    if (!req.description) {
      return false;
    }
    return Boolean(isCard4lRequest(req) && req.description.includes(id));
  });
};

const GetLatestBatchRequest = ({ token, setDatatakes }) => {
  const responseHandler = useCallback(
    (response) => {
      const requests = response.member.sort((b, a) => new Date(a.created) - new Date(b.created));
      const card4lIds = getCard4lIds(requests);
      let validCard4lReq;
      for (let card4lId of card4lIds) {
        const card4lRequests = getCard4lRequests(requests, card4lId);
        console.log(card4lRequests);
        const single = mergeBatchResponses(card4lRequests);
        if (filterCrashedRequests(single)) {
          validCard4lReq = single;
          break;
        }
      }
      if (validCard4lReq) {
        store.dispatch(s1batchSlice.actions.setFetchedBatchRequests([validCard4lReq]));
        store.dispatch(s1batchSlice.actions.setExtraInfo(''));
      } else {
        store.dispatch(s1batchSlice.actions.setExtraInfo('CARD4L Request not found'));
      }
      store.dispatch(s1batchSlice.actions.setCatalogAnalyseInfo({}));
      setDatatakes([]);
    },
    [setDatatakes],
  );

  return (
    <div>
      <RequestButton
        buttonText="Latest Request"
        request={getAllBatchRequests}
        args={[token]}
        validation={Boolean(token)}
        className="secondary-button mr-2"
        responseHandler={responseHandler}
        errorHandler={errorHandler}
        disabledTitle="Log in to use this"
      />
    </div>
  );
};

export default connect((store) => ({ token: store.auth.user.access_token }))(GetLatestBatchRequest);
