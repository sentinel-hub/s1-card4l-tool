import axios from 'axios';
import { doLogout, doLogin } from './components/Header/AuthHeader';
import store, { authSlice } from './store';

const lastUsedToken = {
  token: '',
  time: 0,
};

let isReloggingIn = false;

const timeOutUntilFinishesLoggingIn = (request) => {
  if (isReloggingIn === false) {
    request.headers.Authorization = 'Bearer ' + lastUsedToken.token;
    return axios(request);
  }
  return setTimeout(() => {
    return timeOutUntilFinishesLoggingIn(request);
  }, 2000);
};

const shouldRetry = (request) => {
  if (!request.maxRetries || request.maxRetries <= request.currentRetry) {
    return false;
  }
  if (!request.currentRetry || request.maxRetries > request.currentRetry) {
    return true;
  }
};

const logError = (error) => {
  console.error('Request Failed, details below');
  console.log(`Request to ${error.config.url} FAILED`);
  try {
    let err = error.response.data.error;
    console.log('Error details');
    console.log(`Status ${err.status}, Reason: ${err.reason}, Message: ${err.message}`);
  } catch (err) {
    console.error(error);
  }
  try {
    console.log('Payload:', error.config.data);
  } catch (err) {}
};

const getTokenFromHeaders = (config) => {
  if (config.headers.Authorization) {
    return config.headers.Authorization.split('Bearer ')[1];
  }
};

export const configureNormalRetries = () => {
  // Interceptor to use an already refreshed token when a list of promises is being used.
  axios.interceptors.request.use(
    (config) => {
      if (
        lastUsedToken.time &&
        getTokenFromHeaders(config) !== lastUsedToken.token &&
        (lastUsedToken.time - Date.now()) / 1000 < 3600
      ) {
        config.headers.Authorization = 'Bearer ' + lastUsedToken.token;
        return config;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (axios.isCancel(error)) {
        console.log('Request Cancelled');
        throw error;
      }
      let originalRequest = error.config;

      if (error.response && error.response.status === 429) {
        return new Promise((resolve, rej) => {
          setTimeout(() => {
            resolve(axios(error.config));
          }, 15000);
        });
      }
      // Expired token
      if (error.response && error.response.status === 401 && !originalRequest._retryDueExpired) {
        if (isReloggingIn) {
          return timeOutUntilFinishesLoggingIn(originalRequest);
        }
        originalRequest._retryDueExpired = true;
        isReloggingIn = true;
        doLogout();
        return doLogin().then((token) => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          lastUsedToken.token = token;
          lastUsedToken.time = Date.now();
          isReloggingIn = false;
          return axios(originalRequest);
        });
      }
      if (shouldRetry(error.config)) {
        let cr = !originalRequest.currentRetry ? 1 : originalRequest.currentRetry + 1;
        originalRequest.currentRetry = cr;
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(axios(originalRequest));
          }, 1000);
        });
      }
      logError(error);
      return Promise.reject(error);
    },
  );
};

const is401 = (error) => {
  try {
    return error.response.status === 401;
  } catch (err) {
    return false;
  }
};

let refetchedEdcToken = undefined;
export const edcResponseInterceptor = () => {
  axios.interceptors.request.use((config) => {
    if (refetchedEdcToken && new Date() < refetchedEdcToken.expires_in) {
      config.headers.Authorization = 'Bearer ' + refetchedEdcToken.access_token;
      return config;
    }
    if (refetchedEdcToken) {
      refetchedEdcToken = undefined;
    }
    return config;
  });
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      let originalRequest = error.config;
      if (is401(error) && !originalRequest._retry) {
        console.log(originalRequest._refetchedEdcToken);
        originalRequest._retry = true;
        if (refetchedEdcToken && new Date() < refetchedEdcToken.expires_in) {
          originalRequest.headers.Authorization = 'Bearer ' + refetchedEdcToken.access_token;
          return axios(originalRequest);
        }
        return axios.post('/token_sentinel_hub').then((res) => {
          store.dispatch(
            authSlice.actions.setUser({ userdata: 'EDC User', access_token: res.data.access_token }),
          );
          originalRequest.headers.Authorization = 'Bearer ' + res.data.access_token;
          refetchedEdcToken = {
            access_token: res.data.access_token,
            expires_in: Date.now() + res.data.expires_in * 1000,
          };
          return axios(originalRequest);
        });
      }
    },
  );
};

// let requestsMade = []

// const MAX_RETRIES = 300;
// const INTERVAL = 60000; //ms
// const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

// // remove all requests made too early.
// const updateRequestsMade = (offset = 0) => {
//   let now = Date.now() + offset;
//   let start = now - INTERVAL;
//   let idx = requestsMade.findIndex(timestamp => timestamp < start);
//   if (idx !== -1) {
//     return requestsMade.slice(idx);
//   }
//   return requestsMade;
// }

// const getWaitTime  = () => {
//   let start = requestsMade[0];
//   let end = requestsMade[requestsMade.length-1];
//   let interval = end - start;
//   return INTERVAL - interval;
// }

// axios.interceptors.request.use(
//   (config) => {
//     requestsMade = updateRequestsMade();
//     // we're on rate limit.
//     if (requestsMade.length >= MAX_RETRIES) {
//       //figure out time.
//       let time = getWaitTime();
//       requestsMade.push(Date.now() + time);
//       requestsMade = updateRequestsMade(time);
//       return sleep(time).then(() => config);
//     }
//     // do request.
//     else {
//       requestsMade.push(Date.now());
//       return config;
//     }
//   }
// )
