import React from 'react';
import store, { s1batchSlice } from '../../store';
import Toggle from '../Toggle/Toggle';
import BatchGridSelection from './BatchGridSelection';

const BatchAdvancedOutputOptions = ({ resolution, tilingGrid, advancedOutputOptions }) => {
  return (
    <>
      <BatchGridSelection resolution={resolution} tilingGrid={tilingGrid} />
      <BatchExtraOutputOptions advancedOutputOptions={advancedOutputOptions} />
    </>
  );
};

const BatchExtraOutputOptions = ({ advancedOutputOptions }) => {
  const handleTilePathChange = (e) => {
    store.dispatch(
      s1batchSlice.actions.setAdvancedOptions({ key: 'defaultTilePath', value: e.target.value }),
    );
  };

  const handleCreateCollectionChange = () => {
    store.dispatch(
      s1batchSlice.actions.setAdvancedOptions({
        key: 'createCollection',
        value: !advancedOutputOptions.createCollection,
      }),
    );
  };

  const handleCollectionIdChange = (e) => {
    store.dispatch(s1batchSlice.actions.setAdvancedOptions({ key: 'collectionId', value: e.target.value }));
  };

  return (
    <>
      <label className="form__label" htmlFor="adv-tile-path">
        Tile Path
      </label>
      <input
        className="form__input"
        id="adv-tile-path"
        onChange={handleTilePathChange}
        value={advancedOutputOptions.defaultTilePath ?? ''}
        placeholder="Write your tile path. E.g: mybucket/my-target-folder"
      />
      <div className="flex items-center mb-2 whitespace-normal mt-2">
        <label className="form__label cursor-pointer mr-2" htmlFor="adv-create-collection">
          Create Collection?
        </label>
        <Toggle
          checked={advancedOutputOptions.createCollection}
          onChange={handleCreateCollectionChange}
          id="adv-create-collection"
        />
      </div>
      <label className="form__label" htmlFor="adv-collection-id">
        Collection Id
      </label>
      <input
        disabled={advancedOutputOptions.createCollection ?? false}
        className="form__input mb-2"
        id="adv-collection-id"
        onChange={handleCollectionIdChange}
        value={advancedOutputOptions.collectionId ?? ''}
        placeholder="Only this or create collection can be specified"
      />
    </>
  );
};

export default BatchAdvancedOutputOptions;
