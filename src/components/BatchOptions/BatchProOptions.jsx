import React from 'react';
import BatchGridSelection from './BatchGridSelection';
import { BatchBucketNormalOptions } from './BatchNormalOptions';

const BatchProOptions = ({
  tilingGrid,
  resolution,
  bucketName,
  overwrite,
  isUsingAutoPrefix,
  isUsingTemporalBucket,
  isProMode,
}) => {
  return (
    <>
      <BatchGridSelection tilingGrid={tilingGrid} resolution={resolution} isProMode={isProMode} />
      <BatchBucketNormalOptions
        bucketName={bucketName}
        isUsingAutoPrefix={isUsingAutoPrefix}
        isUsingTemporalBucket={isUsingTemporalBucket}
        isProMode={isProMode}
        overwrite={overwrite}
      />
    </>
  );
};

export default BatchProOptions;
