import React, { useMemo, useState } from 'react';
import useDidMountEffect from '../../lib/useDidMountEffect';
import store, { s1batchSlice } from '../../store';
import RequestButton from '../RequestButton/RequestButton';
import { validateAccountType } from './Analyse';
import { createAll, startAll, deleteAll, mergeBatchResponses } from './utils';

const CreateAll = ({ state, setDatatakes, datatakes, setCreatedRequests, setRejectedDatatakes }) => {
  const createAllResponseHandler = (resp) => {
    // {fullfilled : [id], rejected : [datatake]};
    const { fulfilled, rejected } = resp;
    if (rejected.length > 0) {
      store.dispatch(s1batchSlice.actions.setExtraInfo(`${rejected.length} requests could not be created.`));
      setRejectedDatatakes(rejected);
      setCreatedRequests(fulfilled);
    } else {
      setCreatedRequests(fulfilled);
      store.dispatch(
        s1batchSlice.actions.setExtraInfo(
          'Requests successfully created. Click Start All to confirm and proceed with the workflow.',
        ),
      );
    }
  };

  //Reset datatake each time state that affects them changes.
  useDidMountEffect(() => {
    setDatatakes([]);
  }, [
    state.s1odc.geometry,
    state.s1odc.processingOptions,
    state.s1odc.dataFilterOptions,
    state.s1odc.crs,
    state.s1odc.timeFrom,
    state.s1odc.timeTo,
    state.s1odc.mission,
    setDatatakes,
  ]);

  return (
    <RequestButton
      buttonText="Create All"
      args={[state, datatakes]}
      request={createAll}
      className="secondary-button mr-2"
      title="This will create all requests associated with your order"
      validation={validateAccountType(state.auth.user, state.auth.isEdcUser) && datatakes.length < 20}
      disabledTitle="Only CARD4L Requests with less than 20 datatakes can be confirmed."
      responseHandler={createAllResponseHandler}
    />
  );
};

export const StartAll = ({ createdRequests, token, setCreatedRequests, isResuming = false }) => {
  const ids = useMemo(() => createdRequests.map((br) => br.id), [createdRequests]);
  const startAllResponseHandler = (resp) => {
    const { rejected, fulfilled } = resp;
    store.dispatch(
      s1batchSlice.actions.setExtraInfo(
        `${fulfilled.length} requests STARTED successfully.${
          rejected.length > 0 ? ` ${rejected.length} requests failed to start.` : ''
        }`,
      ),
    );
    if (isResuming === false) {
      const single = mergeBatchResponses(createdRequests);
      // update requests
      single.status = 'PROCESSING';
      single.batchRequests = single.batchRequests.map((br) => ({ ...br, userAction: 'START' }));
      store.dispatch(s1batchSlice.actions.setCatalogAnalyseInfo({}));
      store.dispatch(s1batchSlice.actions.setFetchedBatchRequests([single]));
      setCreatedRequests([]);
    }
  };

  return (
    <RequestButton
      buttonText={isResuming ? 'Resume Order' : 'Start All'}
      args={[ids, token]}
      request={startAll}
      className="secondary-button mx-2"
      title="This will confirm all orders and consume PUs"
      validation={Boolean(token && ids.length)}
      responseHandler={startAllResponseHandler}
    />
  );
};

const DeleteAll = ({
  setCreatedRequests,
  ids,
  token,
  setRejectedDatatakes,
  isDeletingCrashedOrder = false,
}) => {
  const deleteAllResponseHandler = (resp) => {
    const { rejected, fulfilled } = resp;
    store.dispatch(
      s1batchSlice.actions.setExtraInfo(
        `${fulfilled.length} requests DELETED.${
          rejected.length > 0 ? ` ${rejected.length} requests failed to delete.` : ''
        }`,
      ),
    );
    setCreatedRequests([]);
    if (isDeletingCrashedOrder && setRejectedDatatakes) {
      setRejectedDatatakes([]);
    }
  };
  return (
    <RequestButton
      buttonText="Delete All"
      args={[ids, token]}
      request={deleteAll}
      className="secondary-button secondary-button--cancel mr-2"
      title="This will delete all created requests"
      validation={Boolean(token && ids.length)}
      responseHandler={deleteAllResponseHandler}
    />
  );
};

const CreateAndStartContainer = ({ state, setDatatakes, datatakes }) => {
  const [createdRequests, setCreatedRequests] = useState([]);
  const [rejectedDatatakes, setRejectedDatatakes] = useState([]);
  const token = state.auth.user.access_token;
  if (rejectedDatatakes.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <p className="text text--warning" style={{ marginRight: '1rem' }}>
          {rejectedDatatakes.length} Datatakes failed.{' '}
          {createdRequests.length > 0 ? 'Delete them and restart the process!' : ''}
        </p>
        {createdRequests.length > 0 && (
          <DeleteAll
            ids={createdRequests.map((req) => req.id)}
            token={token}
            setCreatedRequests={setCreatedRequests}
            setRejectedDatatakes={setRejectedDatatakes}
            isDeletingCrashedOrder={true}
          />
        )}
      </div>
    );
  }
  if (createdRequests.length > 0) {
    return (
      <>
        <StartAll createdRequests={createdRequests} token={token} setCreatedRequests={setCreatedRequests} />
        <DeleteAll
          ids={createdRequests.map((req) => req.id)}
          token={token}
          setCreatedRequests={setCreatedRequests}
        />
      </>
    );
  }
  return (
    <CreateAll
      datatakes={datatakes}
      setDatatakes={setDatatakes}
      state={state}
      setCreatedRequests={setCreatedRequests}
      setRejectedDatatakes={setRejectedDatatakes}
    />
  );
};

export default CreateAndStartContainer;
