import React from 'react';
import store, { s1batchSlice } from '../../store';
import { connect } from 'react-redux';
import { evalscriptByResponses, polarizationToResponses } from '../../constEvalscripts';
import Select from '../Select';

const responsesToFilter = ['HH', 'VV', 'HV', 'VH'];

const getOrthorectifyValue = (orthorectify, demInstance) => {
  if (!Boolean(orthorectify)) {
    return false;
  }
  return demInstance !== undefined ? demInstance : 'MAPZEN';
};

const S1GRDOptions = ({
  reduxAcquisitionMode,
  reduxPolarization,
  reduxOrbitDirection,
  reduxBackCoeff,
  reduxOrthorectify,
  // downsampling,
  upsampling,
  resolution,
  mission,
  responses,
  isProMode,
  reduxDemInstance,
}) => {
  const handleAqcuisitionModeChange = (value) => {
    if (value === 'EW') {
      handlePolarizationChange('DH');
    }
    if (value === 'IW') {
      handlePolarizationChange('DV');
    }
    store.dispatch(s1batchSlice.actions.setDataFilterOptions({ acquisitionMode: value }));
  };

  const handlePolarizationChange = (value) => {
    const newResponses = polarizationToResponses[value];
    const newEvalscript = evalscriptByResponses(newResponses);
    const absoluteResponses = responses.filter((resp) => !responsesToFilter.includes(resp));
    store.dispatch(s1batchSlice.actions.setResponsesAbsoulte([...newResponses, ...absoluteResponses]));
    store.dispatch(s1batchSlice.actions.setEvalscript(newEvalscript));
    store.dispatch(s1batchSlice.actions.setDataFilterOptions({ polarization: value }));
  };

  const handleOrbitDirectionChange = (value) => {
    store.dispatch(s1batchSlice.actions.setDataFilterOptions({ orbitDirection: value }));
  };

  const handleResmplingChange = (value) => {
    store.dispatch(s1batchSlice.actions.setProcessingOptions({ upsampling: value }));
    store.dispatch(s1batchSlice.actions.setProcessingOptions({ downsampling: value }));
  };

  const handleResolutionChange = (value) => {
    store.dispatch(s1batchSlice.actions.setDataFilterOptions({ resolution: value }));
  };

  const handleBackCoeffChange = (value) => {
    store.dispatch(s1batchSlice.actions.setProcessingOptions({ backCoeff: value }));
  };

  const handleOrthorectifyChange = (value) => {
    const orthorectify = Boolean(value);
    store.dispatch(s1batchSlice.actions.setProcessingOptions({ orthorectify: orthorectify }));
    if (orthorectify) {
      store.dispatch(s1batchSlice.actions.setProcessingOptions({ demInstance: value }));
    } else {
      store.dispatch(s1batchSlice.actions.setProcessingOptions({ demInstance: 'DEFAULT' }));
    }
  };

  const handleMissionChange = (value) => {
    store.dispatch(s1batchSlice.actions.setMission(value));
  };

  return (
    <div style={{ paddingTop: '0' }}>
      <Select
        options={[
          { value: 'DEFAULT', name: 'Any' },
          { value: 'S1A', name: 'S1A' },
          { value: 'S1B', name: 'S1B' },
        ]}
        label="Satellite Platform"
        onChange={handleMissionChange}
        selected={mission}
      />

      <Select
        label="Resampling"
        labelClassName="mt-2"
        options={[
          { value: 'NEAREST', name: 'Nearest' },
          { value: 'BILINEAR', name: 'Bilinear' },
          { value: 'BICUBIC', name: 'Bicubic' },
        ]}
        selected={upsampling}
        onChange={handleResmplingChange}
      />

      <Select
        label="Acquisition Mode"
        labelClassName="mt-2"
        onChange={handleAqcuisitionModeChange}
        selected={reduxAcquisitionMode}
        options={[
          { value: 'DEFAULT', name: 'Any' },
          { value: 'SM', name: 'SM' },
          { value: 'IW', name: 'IW' },
          { value: 'EW', name: 'EW' },
          { value: 'WV', name: 'WV' },
        ]}
      />

      <Select
        label="Polarization"
        labelClassName="mt-2"
        options={[
          { value: 'SH', name: 'SH' },
          { value: 'SV', name: 'SV' },
          { value: 'DH', name: 'DH' },
          { value: 'DV', name: 'DV' },
          { value: 'HH', name: 'HH' },
          { value: 'HV', name: 'HV' },
          { value: 'VV', name: 'VV' },
          { value: 'VH', name: 'VH' },
        ]}
        onChange={handlePolarizationChange}
        selected={reduxPolarization}
      />

      <Select
        label="Resolution"
        labelClassName="mt-2"
        onChange={handleResolutionChange}
        selected={resolution}
        options={[
          { value: 'DEFAULT', name: 'Any' },
          { value: 'HIGH', name: 'HIGH' },
          { value: 'MEDIUM', name: 'MEDIUM' },
        ]}
      />

      <Select
        label="Orbit Direction"
        labelClassName="mt-2"
        onChange={handleOrbitDirectionChange}
        selected={reduxOrbitDirection}
        options={[
          { value: 'DEFAULT', name: 'Any' },
          { value: 'ASCENDING', name: 'Ascending' },
          { value: 'DESCENDING', name: 'Descending' },
        ]}
      />

      {isProMode && (
        <Select
          label="Backscatter coefficient"
          labelClassName="mt-2"
          selected={reduxBackCoeff}
          onChange={handleBackCoeffChange}
          options={[
            { value: 'DEFAULT', name: 'Default (gamma0)' },
            { value: 'BETA0', name: 'beta0' },
            { value: 'SIGMA0_ELLIPSOID', name: 'sigma0' },
            { value: 'GAMMA0_ELLIPSOID', name: 'gamma0' },
            { value: 'GAMMA0_TERRAIN', name: 'gamma0 (terrain)' },
          ]}
        />
      )}

      {isProMode && (
        <Select
          label="DEM"
          labelClassName="mt-2"
          options={[
            { value: 'MAPZEN', name: 'Mapzen DEM' },
            { value: 'COPERNICUS', name: 'Copernicus 10m/30m DEM' },
            { value: 'COPERNICUS_30', name: 'Copernicus 30m DEM' },
            { value: 'COPERNICUS_90', name: 'Copernicus 90m DEM' },
          ]}
          onChange={handleOrthorectifyChange}
          selected={getOrthorectifyValue(reduxOrthorectify, reduxDemInstance)}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => ({
  reduxAcquisitionMode: store.s1odc.dataFilterOptions.acquisitionMode,
  reduxPolarization: store.s1odc.dataFilterOptions.polarization,
  reduxOrbitDirection: store.s1odc.dataFilterOptions.orbitDirection,
  reduxBackCoeff: store.s1odc.processingOptions.backCoeff,
  reduxOrthorectify: store.s1odc.processingOptions.orthorectify,
  reduxDemInstance: store.s1odc.processingOptions.demInstance,
  // downsampling: store.s1odc.processingOptions.downsampling,
  upsampling: store.s1odc.processingOptions.upsampling,
  resolution: store.s1odc.dataFilterOptions.resolution,
  mission: store.s1odc.mission,
  responses: store.s1odc.responses,
  isProMode: store.params.isProMode,
});

export default connect(mapStateToProps)(S1GRDOptions);
