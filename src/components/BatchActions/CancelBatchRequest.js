import React from 'react';
import RequestButton from '../RequestButton/RequestButton';
import { cancelBatchRequests } from './utils';
import { connect } from 'react-redux';
import store, { s1batchSlice } from '../../store';

const responseHandlerCancel = (res) => {
  const { fulfilled, rejected } = res;
  store.dispatch(
    s1batchSlice.actions.setExtraInfo(
      `${fulfilled} requests cancelled. ${
        rejected.length > 0 ? `${rejected.length} requests failed when trying to cancel.` : ''
      }`,
    ),
  );
  store.dispatch(s1batchSlice.actions.setCatalogAnalyseInfo({}));
};

const errorHandler = (error) => {
  store.dispatch(
    s1batchSlice.actions.setExtraInfo(
      'Request cannot be cancelled, check console for a more detailed error message',
    ),
  );
  console.error(error);
};

const CancelBatchRequest = ({ token, ids }) => {
  return (
    <RequestButton
      buttonText="Cancel"
      request={cancelBatchRequests}
      args={[token, ids]}
      validation={Boolean(token && ids)}
      className="secondary-button mr-2"
      responseHandler={responseHandlerCancel}
      errorHandler={errorHandler}
      disabledTitle="Log in and select a request to cancel it"
    />
  );
};

const mapStateToProps = (state) => ({
  token: state.auth.user.access_token,
});
export default connect(mapStateToProps)(CancelBatchRequest);
