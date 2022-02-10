import React from 'react';
import store, { s1batchSlice } from '../../store';
import Select from '../Select';

const generateResolutions = (tillingGridId, isProMode) => {
  switch (tillingGridId) {
    case 0:
      return [10.0, 20.0, 60.0];
    case 1:
      return [10.0, 20.0];
    case 2:
      return [60.0, 120.0, 240.0, 360.0];
    case 3:
      return isProMode ? [0.0001, 0.0002] : [0.0002];
    case 6:
      return [40.0, 50.0, 100.0];
    case 7:
      return [10.0, 20.0];
    default:
      return [];
  }
};

const BatchGridSelection = ({ tilingGrid, resolution, isProMode }) => {
  const handleGridIdChange = (value) => {
    store.dispatch(s1batchSlice.actions.setTilingGrid(Number(value)));
    const possibleResolutions = generateResolutions(Number(value), isProMode);
    if (!possibleResolutions.includes(resolution)) {
      store.dispatch(s1batchSlice.actions.setResolution(possibleResolutions[0]));
    }
  };

  const handleResolutionChange = (value) => {
    store.dispatch(s1batchSlice.actions.setResolution(Number(value)));
  };

  return (
    <>
      <Select
        label="Grid"
        options={[
          { value: 0, name: 'UTM 20km' },
          { value: 1, name: 'UTM 10km' },
          { value: 2, name: 'UTM 100km' },
          { value: 3, name: 'WGS 84 1 degree' },
          { value: 6, name: 'LAEA 100km' },
          { value: 7, name: 'LAEA 20km' },
        ]}
        selected={tilingGrid}
        onChange={handleGridIdChange}
      />

      <Select
        label="Resolution"
        labelClassName="mt-2"
        onChange={handleResolutionChange}
        selected={resolution}
        options={generateResolutions(tilingGrid, isProMode).map((res) => ({
          value: res,
          name: res,
        }))}
      />
    </>
  );
};

export default BatchGridSelection;
