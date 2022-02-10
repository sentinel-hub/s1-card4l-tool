import React, { useState, useCallback } from 'react';
import Toggle from '../Toggle/Toggle';

import { connect } from 'react-redux';
import store, { s1batchSlice } from '../../store';
import Tooltip from '../Tooltip/Tooltip';

const Responses = ({ responses }) => {
  const [editingResponses, setEditingResponses] = useState(false);

  const generateResponses = useCallback((responses) => {
    return responses.map((resp, idx) => (
      <div key={idx + 'response'}>
        <label className="form__label">Identifier {idx + 1}</label>
        <input
          className="form__input"
          type="text"
          value={resp}
          name={idx}
          onChange={handleIdentifierChange}
        />
        {idx === 0 ? null : (
          <button
            name={idx}
            onClick={handleDeleteResponse}
            className="secondary-button secondary-button--cancel my-2"
          >
            Remove
          </button>
        )}
        {responses.length - 1 === idx ? null : <hr className="mb-2" />}
      </div>
    ));
  }, []);

  const handleIdentifierChange = (e) => {
    store.dispatch(s1batchSlice.actions.setResponses({ idx: e.target.name, value: e.target.value }));
  };

  const handleDeleteResponse = (e) => {
    store.dispatch(s1batchSlice.actions.removeResponse(e.target.name));
  };

  const handleAddResponse = () => {
    store.dispatch(s1batchSlice.actions.addResponse());
  };

  const handleChange = () => {
    setEditingResponses(!editingResponses);
  };

  return (
    <>
      <div className="mb-2 mt-2 flex items-center">
        <h2 className="heading-secondary mr-2">Responses</h2>
        <Tooltip content="Edit responses for a multiresponse request" />
      </div>

      <div className="form">
        <div className="flex items-center mb-2 whitespace-normal">
          <label htmlFor="edit-responses" className="form__label mr-2 cursor-pointer">
            {editingResponses ? 'Hide Responses' : 'Show Responses'}
          </label>
          <Toggle checked={editingResponses} onChange={handleChange} id="edit-responses" />
        </div>

        {!editingResponses ? null : <div className="responses-container">{generateResponses(responses)}</div>}

        {!editingResponses ? null : (
          <button className="secondary-button secondary-button--fit" onClick={handleAddResponse}>
            Add Response
          </button>
        )}
      </div>
    </>
  );
};

const mapStateToProps = (state) => ({
  responses: state.s1odc.responses,
});

export default connect(mapStateToProps)(Responses);
