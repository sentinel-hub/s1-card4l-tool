import React, { useEffect, useState } from 'react';
import store, { s1batchSlice } from '../../store';
import Modal from '../Modal/Modal';
import RequestPreview from './RequestPreview';

const ShowRequestPreview = ({ datatakes, isOnDebugMode }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedDatatake, setSelectedDatatake] = useState(undefined);

  useEffect(() => {
    setSelectedIndex(0);
    if (datatakes.length > 0) {
      setSelectedDatatake(datatakes[0]);
    } else {
      setSelectedDatatake(undefined);
    }
  }, [datatakes]);

  useEffect(() => {
    setSelectedDatatake(datatakes[selectedIndex]);
    // eslint-disable-next-line
  }, [selectedIndex]);

  const handleSelectNextDatatake = () => {
    if (datatakes.length === selectedIndex + 1) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const handleStartAnimation = async () => {
    const allGeos = datatakes.map((d) => d.geometry);
    let idx = 0;
    let geo = allGeos[idx];
    while (geo) {
      store.dispatch(s1batchSlice.actions.setExtraGeometry(allGeos[idx]));
      idx++;
      geo = allGeos[idx];
      await sleep(10);
    }
  };
  return (
    <>
      {isOnDebugMode && datatakes.length > 0 && (
        <button className="secondary-button" onClick={handleStartAnimation}>
          Start Geometries Animation
        </button>
      )}
      <Modal
        trigger={(handleOpen) => (
          <button onClick={handleOpen} className="secondary-button">
            Show Preview
          </button>
        )}
      >
        {(handleClose) => (
          <>
            <p className="request-preview-overlay--info">
              {datatakes.length > 0
                ? `UUID will be generated when requests are started - Selected Datatake: ${selectedIndex + 1}`
                : 'Geometry, time range and uuid will be generated with data from each datatake found once the order is started.'}
            </p>
            {datatakes.length > 0 ? (
              <button className="secondary-button" onClick={handleSelectNextDatatake}>
                Next datatake
              </button>
            ) : null}
            <button className="secondary-button secondary-button--cancel" onClick={handleClose}>
              Close
            </button>
            <RequestPreview
              selectedDatatake={selectedDatatake}
              handleClosePreview={handleClose}
              isOnDebugMode={isOnDebugMode}
            />
          </>
        )}
      </Modal>
    </>
  );
};

export default ShowRequestPreview;
