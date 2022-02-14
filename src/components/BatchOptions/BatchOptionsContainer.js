import React from 'react';
import { connect } from 'react-redux';
import Analyse from '../BatchActions/Analyse';
import ShowRequestPreview from '../ShowRequestPreview';
import BatchAdvancedOutputOptions from './BatchAdvancedOutputOptions';
import BatchProOptions from './BatchProOptions';

const BatchOptionsContainer = ({
  resolution,
  bucketName,
  datatakes,
  setDatatakes,
  isUsingTemporalBucket,
  isUsingAutoPrefix,
  tilingGrid,
  isProMode,
  isOnDebugMode,
  isSettingOutput,
  overwrite,
  advancedOptions,
  isEdcUser,
}) => {
  const generateBatchOptions = () => {
    if (!isSettingOutput && !isEdcUser) {
      return (
        <BatchProOptions
          bucketName={bucketName}
          isUsingAutoPrefix={isUsingAutoPrefix}
          isUsingTemporalBucket={isUsingTemporalBucket}
          resolution={resolution}
          tilingGrid={tilingGrid}
          overwrite={overwrite}
          isProMode={isProMode}
        />
      );
    }
    return (
      <BatchAdvancedOutputOptions
        resolution={resolution}
        tilingGrid={tilingGrid}
        advancedOutputOptions={advancedOptions}
      />
    );
  };
  return (
    <>
      <h2 className="heading-secondary" style={{ marginBottom: '1.2rem' }}>
        Output Information
      </h2>
      <div className="form">
        {generateBatchOptions()}
        <div className="flex items-center">
          <Analyse datatakes={datatakes} setDatatakes={setDatatakes} />
          <ShowRequestPreview datatakes={datatakes} isOnDebugMode={isOnDebugMode} />
        </div>

        <div className="info-banner mt-2">
          <p>Warning: Before confirming a new order, please wait for the previous orders to finish.</p>
        </div>
        <div className="info-banner mt-2">
          <p>Warning: Only CARD4L Requests with less than 20 datatakes can be confirmed.</p>
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (store) => ({
  tilingGrid: store.s1odc.tilingGrid,
  resolution: store.s1odc.resolution,
  description: store.s1odc.description,
  bucketName: store.s1odc.bucketName,
  isUsingTemporalBucket: store.s1odc.isUsingTemporalBucket,
  isUsingAutoPrefix: store.s1odc.isUsingAutoPrefix,
  isProMode: store.params.isProMode,
  isOnDebugMode: store.params.debugMode,
  isSettingOutput: store.params.isSettingOutput,
  isEdcUser: store.auth.isEdcUser,
  overwrite: store.s1odc.overwrite,
  advancedOptions: store.s1odc.advancedOptions,
});

export default connect(mapStateToProps)(BatchOptionsContainer);
