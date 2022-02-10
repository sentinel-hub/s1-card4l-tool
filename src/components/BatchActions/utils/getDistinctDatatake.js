import bboxPolygon from '@turf/bbox-polygon';
import intersect from '@turf/intersect';
import union from '@turf/union';
import buffer from '@turf/buffer';
import simplify from '@turf/simplify';
import moment from 'moment';

const unionAll = (listOfGeometries) => {
  if (listOfGeometries.length === 0) {
    return null;
  }
  let ret = buffer(listOfGeometries[0], 0.1);
  for (let i = 0; i < listOfGeometries.length; i++) {
    if (i > 0) {
      ret = union(ret, buffer(listOfGeometries[i], 0.1)).geometry;
    }
  }
  return ret;
};

export const buildExtraResultsDictionary = (extraResults) =>
  extraResults.reduce((acc, currentFeature) => {
    const dt = getDataTake(currentFeature);
    if (!acc[dt]) {
      acc[dt] = [currentFeature];
    } else {
      acc[getDataTake(currentFeature)].push(currentFeature);
    }

    return acc;
  }, {});

const mergeSameDatatakeFeatures = (listToMerge, stateGeo, stateTimerange) => {
  let result = [];
  const failedDatatakes = [];
  const [stateTo, stateFrom] = [moment.utc(stateTimerange[0]), moment.utc(stateTimerange[1])];
  for (let { features, extraResults } of listToMerge) {
    try {
      // filter tiles that dont belong to original timerange.
      let unionGeo = unionAll(
        features
          .filter((feature) =>
            moment.utc(feature.properties.datetime).isBetween(stateTo, stateFrom, undefined, '[]'),
          )
          .map((f) => f.geometry),
      );
      let mergedGeo = simplify(intersect(unionGeo, stateGeo), { tolerance: 0.1 });
      if (!mergedGeo) {
        failedDatatakes.push(getDataTake(features[0]));
        continue;
      }

      const from = moment
        .min(features.concat(extraResults).map((f) => moment(f.properties.datetime)))
        .utc()
        .format();
      const to = moment
        .max(features.concat(extraResults).map((f) => moment(f.properties.datetime)))
        .add(1, 'seconds')
        .utc()
        .format();
      const minAndMaxTimeStamps = [from, to];

      result.push({
        geometry: mergedGeo.geometry,
        timeRange: minAndMaxTimeStamps,
        datatake: getDataTake(features[0]),
      });

      mergedGeo = null;
      unionGeo = null;
    } catch (err) {
      console.error('err', err);
      failedDatatakes.push(getDataTake(features[0]));
    }
  }

  return { result, failedDatatakes };
};

// checks if both timestamps are in a 30min time-span.
const areSameDatatake = (timestamp1, timestamp2) =>
  Math.abs(moment.utc(timestamp1).diff(moment.utc(timestamp2))) <= 1800000;

export const getDataTake = (feature) => feature.id.split('_').slice(-2)[0];

const validAqcuisitionMode = (feature, acquisitionMode) => {
  if (acquisitionMode === 'DEFAULT') {
    return true;
  }
  return (
    feature.properties &&
    feature.properties['sar:instrument_mode'] &&
    feature.properties['sar:instrument_mode'] === acquisitionMode
  );
};

const validPolarization = (feature, desiredPolarization) => {
  return (
    feature.properties &&
    feature.properties['polarization'] &&
    feature.properties['polarization'] === desiredPolarization
  );
};

const getMissionName = (feature) => feature.id.split('_')[0];

// feature catalog : [{geometry: <geojson>, timestamp, datatake}]
export const getDistinctDataTakes = (
  features,
  extraResultsDictionary,
  geometry,
  timerange,
  acquisitionMode,
  desiredPolarization,
  selectedMission = 'DEFAULT',
) => {
  const stateGeo = geometry.length === 4 ? bboxPolygon(geometry) : geometry;
  let distinctDataTakes = [];
  const toBeMerged = [];
  const alreadyChecked = {};

  if (selectedMission !== 'DEFAULT') {
    features = features.filter((feat) => getMissionName(feat) === selectedMission);
  }

  for (let i = 0; i < features.length; i++) {
    let currentFeature = features[i];
    // Double check aquisition mode.
    if (
      !validAqcuisitionMode(currentFeature, acquisitionMode) ||
      !validPolarization(currentFeature, desiredPolarization)
    ) {
      continue;
    }
    let shouldBeMerged = [currentFeature];
    const datatake1 = getDataTake(currentFeature);

    //if already checked skip it
    if (alreadyChecked[datatake1]) {
      continue;
    }
    alreadyChecked[datatake1] = true;
    for (let j = i + 1; j < features.length; j++) {
      let datatake2 = getDataTake(features[j]);
      if (
        datatake1 === datatake2 &&
        areSameDatatake(currentFeature.properties.datetime, features[j].properties.datetime)
      ) {
        shouldBeMerged.push(features[j]);
      }
    }
    //multiple features with same datatake, need to be merged
    if (shouldBeMerged.length > 1) {
      const extraResults = extraResultsDictionary[datatake1] ?? [];
      toBeMerged.push({ features: shouldBeMerged, extraResults });
    } else {
      let intersectedGeo = intersect(currentFeature.geometry, stateGeo);
      if (intersectedGeo) {
        distinctDataTakes.push({
          geometry: intersectedGeo.geometry,
          timeRange: [
            currentFeature.properties.datetime,
            moment(currentFeature.properties.datetime).add(1, 'seconds').utc().format(),
          ],
          datatake: datatake1,
        });
      }
    }
  }
  let { result: merged, failedDatatakes } = mergeSameDatatakeFeatures(toBeMerged, stateGeo, timerange);
  distinctDataTakes = distinctDataTakes.concat(merged);

  return { distinctDataTakes, failedDatatakes };
};
