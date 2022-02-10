import React from 'react';
import GetAllBatchRequests from '../BatchActions/GetAllBatchRequests';
import BatchRequestSummary from './BatchRequestSummary/BatchRequestSummary';
import { connect } from 'react-redux';
import GetLatestBatchRequest from '../BatchActions/GetLatestBatchRequest';
import CatalogInfo from './CatalogInfo';
import store, { s1batchSlice } from '../../store';

// filter c4l orders where all its requests are "CREATED"
export const filterCrashedRequests = (request) => {
  const { batchRequests } = request;
  let foundAnalyse = false;
  for (let br of batchRequests) {
    const { userAction } = br;
    if (userAction === 'ANALYSE' && !foundAnalyse) {
      foundAnalyse = true;
      continue;
    }
    if (userAction === 'NONE') {
      continue;
    }
    return true;
  }
  return false;
};

const BatchInfo = ({ extraInfo, fetchedRequests, token, catalogInfo, setDatatakes }) => {
  const handleDeleteExtraInfo = () => {
    store.dispatch(s1batchSlice.actions.setExtraInfo(''));
  };

  return (
    <div>
      <h2 className="heading-secondary">Information</h2>
      <div className="form" style={{ minHeight: '400px' }}>
        <div className="flex items-center">
          <GetLatestBatchRequest setDatatakes={setDatatakes} />
          <GetAllBatchRequests setDatatakes={setDatatakes} />
        </div>
        {token ? null : <p className="text mt-2">You need to log in to use this</p>}
        {extraInfo ? (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '2rem' }}>
            <p className="text mr-4">{extraInfo}</p>
            <span
              title="Clear extra information"
              style={{ cursor: 'pointer', fontSize: '2rem' }}
              onClick={handleDeleteExtraInfo}
            >
              &#10799;
            </span>
          </div>
        ) : null}
        <hr className="mt-2" />
        <div style={{ overflowY: 'scroll', maxHeight: '400px' }}>
          {catalogInfo.distinctDates ? <CatalogInfo {...catalogInfo} /> : null}
          {fetchedRequests.filter(filterCrashedRequests).map((request) => (
            <BatchRequestSummary key={request.id} request={request} />
          ))}
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  extraInfo: state.s1odc.extraInfo,
  fetchedRequests: state.s1odc.fetchedBatchRequests,
  token: state.auth.user.access_token,
  catalogInfo: state.s1odc.catalogAnalyseInfo,
});

export default connect(mapStateToProps)(BatchInfo);
