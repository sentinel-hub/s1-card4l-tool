import React, { useState } from 'react';
import DataSourceSelect from './components/Datasource/DataSourceSelect';
import { S1GRD } from './const';
import TimeRange from './components/Timerange/TimeRange';
import EvalscriptEditor from './components/EvalscriptEditor/EvalscriptEditor';
import MapContainer from './components/Map/MapContainer';
import BatchOptions from './components/BatchOptions/BatchOptionsContainer';
import BatchInfo from './components/BatchInfo/BatchInfo';
import Responses from './components/Responses/Responses';

const RequestForm = () => {
  const [datatakes, setDatatakes] = useState([]);
  return (
    <div className="request-form">
      <div className="request-form-first-row">
        <div className="request-form-first-row-first-item">
          <DataSourceSelect datasource={S1GRD} />
        </div>
        <div className="request-form-first-row-second-item">
          <TimeRange />
          <Responses />
        </div>
        <div className="request-form-first-row-third-item">
          <MapContainer />
        </div>
      </div>
      <div className="request-form-second-row">
        <div className="request-form-second-row-first-item">
          <EvalscriptEditor />
        </div>
        <div className="request-form-second-row-second-item">
          <BatchOptions datatakes={datatakes} setDatatakes={setDatatakes} />
        </div>
      </div>
      <div className="request-form-third-row">
        <div className="request-form-third-row-first-item">
          <BatchInfo setDatatakes={setDatatakes} />
        </div>
      </div>
    </div>
  );
};

export default RequestForm;
