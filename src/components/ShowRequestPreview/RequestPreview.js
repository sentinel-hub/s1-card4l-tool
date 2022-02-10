import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';

import store, { s1batchSlice } from '../../store';
import { getBatchBodyCreateWithDatatake } from '../BatchActions/utils';

const DEFAULT_DATATAKE = {
  geometry: '<datatake-geometry>',
  timeRange: [
    '<datatakeYear>-<datatakeMonth>-<datatakeDay>T<datatakeTime>',
    '<datatakeYear>-<datatakeMonth>-<datatakeDay>T<datatakeTime>',
  ],
  datatake: '<datatake-id>',
};

const RequestPreview = ({ state, handleClosePreview, selectedDatatake, isOnDebugMode }) => {
  const [body, setBody] = useState();

  useEffect(() => {
    setBody(
      getBatchBodyCreateWithDatatake(
        state,
        selectedDatatake ?? DEFAULT_DATATAKE,
        '<uuid>',
        `order_<orderTimestamp>`,
      ),
    );
  }, [state, selectedDatatake]);

  return (
    <div>
      <div className="request-preview--close">
        <span onClick={handleClosePreview}>&#10005;</span>
      </div>
      <textarea
        readOnly
        spellCheck={false}
        value={JSON.stringify(body, null, 2)}
        className="request-preview"
      />
      {isOnDebugMode && (
        <button
          className="secondary-button"
          onClick={() => {
            store.dispatch(
              s1batchSlice.actions.setExtraGeometry(body.processRequest?.input?.bounds?.geometry),
            );
          }}
        >
          See geometry on map (as extra)
        </button>
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({
  state: state,
});

export default connect(mapStateToProps)(RequestPreview);
