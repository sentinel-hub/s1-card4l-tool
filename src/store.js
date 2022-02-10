import { configureStore, combineReducers, createSlice } from '@reduxjs/toolkit';
import { DEFAULT_EVALSCRIPT, DEFAULT_BUCKET_NAME } from './const';
import moment from 'moment';

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: {
      userdata: null,
      access_token: null,
    },
    isEdcUser: true,
  },
  reducers: {
    setUser: (state, action) => {
      state.user.userdata = action.payload.userdata;
      state.user.access_token = action.payload.access_token;
    },
    resetUser: (state, action) => {
      state.user.userdata = null;
      state.user.access_token = null;
    },
    setIsEdcUser: (state, action) => {
      state.isEdcUser = action.payload;
    },
  },
});

export const s1batchSlice = createSlice({
  name: 's1odc',
  initialState: {
    // timeFrom: moment.utc('2020-07-15').startOf('day').format(),
    timeFrom: moment.utc('2017-01-01').startOf('day').format(),
    timeTo: moment.utc().endOf('day').format(),
    processingOptions: {
      backCoeff: 'GAMMA0_TERRAIN',
      orthorectify: true,
      demInstance: 'COPERNICUS_30',
      downsampling: 'BILINEAR',
      upsampling: 'BILINEAR',
    },
    dataFilterOptions: {
      acquisitionMode: 'IW',
      polarization: 'DV',
      resolution: 'HIGH',
    },
    mission: 'DEFAULT',
    geometry: [35.666439, -6.23476, 35.861576, -6.075694],
    extraGeometry: null,
    crs: 'EPSG:4326',
    evalscript: DEFAULT_EVALSCRIPT,
    bucketName: DEFAULT_BUCKET_NAME,
    resolution: 0.0002,
    tilingGrid: 3,
    overwrite: false,
    description: '',
    fetchedBatchRequests: [],
    extraInfo: '',
    //isMonitoring: Boolean | [string]
    isMonitoring: false,
    catalogAnalyseInfo: {},
    responses: ['VV', 'VH', 'AREA', 'ANGLE', 'MASK'],
    isUsingTemporalBucket: true,
    isUsingAutoPrefix: true,
    advancedOptions: {
      createCollection: false,
      collectionId: '',
      defaultTilePath: '',
    },
  },
  reducers: {
    setTimeFrom: (state, action) => {
      state.timeFrom = action.payload;
    },
    setTimeTo: (state, action) => {
      state.timeTo = action.payload;
    },
    setProcessingOptions: (state, action) => {
      state.processingOptions = {
        ...state.processingOptions,
        ...action.payload,
      };
    },
    resetProcessingOptions: (state, action) => {
      state.processingOptions = {};
    },
    setDataFilterOptions: (state, action) => {
      state.dataFilterOptions = {
        ...state.dataFilterOptions,
        ...action.payload,
      };
    },
    resetDataFilterOptions: (state, action) => {
      state.dataFilterOptions = {};
    },
    setMission: (state, action) => {
      state.mission = action.payload;
    },
    setEvalscript: (state, action) => {
      state.evalscript = action.payload;
    },
    setResolution: (state, action) => {
      state.resolution = action.payload;
    },
    setBucketName: (state, action) => {
      state.bucketName = action.payload;
    },
    setGeometry: (state, action) => {
      state.geometry = action.payload;
    },
    setCrs: (state, action) => {
      state.crs = action.payload;
    },
    setDescription: (state, action) => {
      state.description = action.payload;
    },
    setFetchedBatchRequests: (state, action) => {
      state.fetchedBatchRequests = action.payload;
    },
    updateFetchedRequest: (state, action) => {
      const { request, id } = action.payload;
      const index = state.fetchedBatchRequests.findIndex((req) => req.id === id);
      state.fetchedBatchRequests[index] = request;
    },
    setExtraInfo: (state, action) => {
      state.extraInfo = action.payload;
    },
    setIsMonitoring: (state, action) => {
      state.isMonitoring = action.payload;
    },
    setCatalogAnalyseInfo: (state, action) => {
      state.catalogAnalyseInfo = action.payload;
    },
    setResponses: (state, action) => {
      let i = parseInt(action.payload.idx);
      state.responses[i] = action.payload.value;
    },
    //used when changing polarization (S1GRDOptions)
    setResponsesAbsoulte: (state, action) => {
      state.responses = action.payload;
    },
    removeResponse: (state, action) => {
      let i = parseInt(action.payload);
      state.responses = state.responses.slice(0, i).concat(state.responses.slice(i + 1));
    },
    addResponse: (state) => {
      state.responses.push('');
    },
    setIsUsingTemporalBucket: (state, action) => {
      if (action.payload === true) {
        state.isUsingAutoPrefix = true;
      }
      state.isUsingTemporalBucket = action.payload;
    },
    setTilingGrid: (state, action) => {
      state.tilingGrid = action.payload;
    },
    setIsUsingAutoPrefix: (state, action) => {
      state.isUsingAutoPrefix = action.payload;
    },
    setExtraGeometry: (state, action) => {
      state.extraGeometry = action.payload;
    },
    setOverwrite: (state, action) => {
      state.overwrite = action.payload;
    },
    setAdvancedOptions: (state, action) => {
      const { key, value } = action.payload;
      state.advancedOptions[key] = value;
    },
  },
});

export const paramsSlice = createSlice({
  name: 'params',
  initialState: {
    isProMode: false,
    debugMode: false,
    isSettingOutput: false,
  },
  reducers: {
    setProMode: (state, action) => {
      state.isProMode = action.payload;
    },
    setDebugMode: (state) => {
      state.debugMode = true;
    },
    setIsSettingOutput: (state) => {
      state.isSettingOutput = true;
    },
  },
});

const reducers = combineReducers({
  s1odc: s1batchSlice.reducer,
  auth: authSlice.reducer,
  params: paramsSlice.reducer,
});

const store = configureStore({
  reducer: reducers,
  devTools: true,
});

export default store;
