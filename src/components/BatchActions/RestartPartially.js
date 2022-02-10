import React from 'react';
import { getCard4lRequest, getLazyRestartPromises } from './utils';
import { connect } from 'react-redux';
import store, { s1batchSlice } from '../../store';
import { queuePromises } from '../../lib/promiseQueue';

const RestartPartially = ({ token, ids, card4lId, userId }) => {
  const handleRestart = async () => {
    store.dispatch(s1batchSlice.actions.setExtraInfo('Fetching and checking PARTIAL requests...'));
    const batchReqResp = await getCard4lRequest(token, card4lId, userId, {});
    const toRestartIds = batchReqResp.filter((br) => br.status === 'PARTIAL').map((br) => br.id);
    const lazyPromises = getLazyRestartPromises(token, toRestartIds);
    let response = await queuePromises(lazyPromises, 100);
    const restarted =
      response.length > 0
        ? response.reduce((acc, cv) => {
            if (cv.status !== 'rejected') {
              return acc + 1;
            }
            return acc;
          }, 0)
        : 0;
    store.dispatch(
      s1batchSlice.actions.setExtraInfo(
        `${restarted} batch requests restarted. Only requests with status PARTIAL will be restarted.`,
      ),
    );
    store.dispatch(s1batchSlice.actions.setCatalogAnalyseInfo({}));
  };

  const isDisabled = () => !Boolean(token && ids);

  return (
    <div>
      <button
        disabled={isDisabled()}
        title="Restart all PARTIAL requests"
        className={isDisabled() ? `secondary-button secondary-button--disabled` : 'secondary-button'}
        onClick={handleRestart}
      >
        Restart failed request
      </button>
    </div>
  );
};

const mapStateToProps = (store) => ({
  token: store.auth.user.access_token,
  userId: store.auth.user?.userdata?.sub,
});
export default connect(mapStateToProps)(RestartPartially);
