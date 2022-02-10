import React, { useEffect } from 'react';
import store, { s1batchSlice } from '../../store';
import Toggle from '../Toggle/Toggle';
import Tooltip from '../Tooltip/Tooltip';

export const BatchBucketNormalOptions = ({
  isUsingTemporalBucket,
  isUsingAutoPrefix,
  bucketName,
  isProMode = false,
  overwrite = false,
}) => {
  const handleSetUsingTemporaryBucket = () => {
    store.dispatch(s1batchSlice.actions.setIsUsingTemporalBucket(!isUsingTemporalBucket));
  };

  const handleAutoPrefixChange = () => {
    store.dispatch(s1batchSlice.actions.setIsUsingAutoPrefix(!isUsingAutoPrefix));
  };

  const handleBucketNameChange = (e) => {
    store.dispatch(s1batchSlice.actions.setBucketName(e.target.value));
  };

  const handleOverwriteChange = () => {
    store.dispatch(s1batchSlice.actions.setOverwrite(!overwrite));
  };

  useEffect(() => {
    if (isProMode) {
      store.dispatch(s1batchSlice.actions.setOverwrite(false));
    }
  }, [isProMode, isUsingAutoPrefix, isUsingTemporalBucket]);

  return (
    <>
      <div className="flex items-center my-2 whitespace-normal">
        <label className="form__label mr-2 cursor-pointer" htmlFor="use-temporary-bucket">
          {isUsingTemporalBucket ? 'Using temporary bucket' : 'Using user defined bucket'}
        </label>
        <Toggle
          checked={isUsingTemporalBucket}
          onChange={handleSetUsingTemporaryBucket}
          id="use-temporary-bucket"
          className="mr-2"
        />
        {isUsingTemporalBucket && (
          <Tooltip content="Data will be stored on default s3 bucket: sh.s1-card4l.eu-central-1.nasa" />
        )}
      </div>

      {!isUsingTemporalBucket && (
        <>
          <div className="flex items-center mb-2 whitespace-normal">
            <label htmlFor="include-auto-prefix" className="form__label mr-2 cursor-pointer">
              Include auto-generated prefix
            </label>
            <Toggle id="include-auto-prefix" checked={isUsingAutoPrefix} onChange={handleAutoPrefixChange} />
          </div>
        </>
      )}

      {isUsingTemporalBucket === false && isUsingAutoPrefix === false && isProMode === true && (
        <div className="flex items-center mb-2 whitespace-normal">
          <label className="form__label mr-2 cursor-pointer" htmlFor="batch-overwrite">
            Overwrite existing files
          </label>
          <Toggle checked={overwrite} onChange={handleOverwriteChange} id="batch-overwrite" />
        </div>
      )}

      {!isUsingTemporalBucket && (
        <div className="info-banner" style={{ margin: 0, marginBottom: '1rem' }}>
          <p>
            Using auto-generated prefix will group all results inside a folder with name:
            "order_&lt;request_datetime&gt;".
          </p>
          <p>
            You can add your own prefix by modifying the Bucket Name field (E.g:
            &lt;your-bucket&gt;/some-prefix){' '}
          </p>
        </div>
      )}

      {isUsingTemporalBucket === false ? (
        <>
          <label className="form__label" htmlFor="bucket-name">
            Bucket Name
          </label>
          <input
            className="form__input"
            placeholder="e.g: my-personal-bucket"
            type="text"
            onChange={handleBucketNameChange}
            value={bucketName}
            id="bucket-name"
          />
          <p className="form__label my-2">
            <strong>
              Note: S3 bucket must be on <i>eu-central-1</i> AWS region.
            </strong>
          </p>
        </>
      ) : null}
    </>
  );
};
