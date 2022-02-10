import React, { useEffect } from 'react';
import Axios from 'axios';
import RequestForm from './RequestForm';
import './App2.css';
import './index.css';
import Header from './components/Header/Header';
import { configureParams, getUrlParams } from './params';
import { configureNormalRetries, edcResponseInterceptor } from './configureAxios';
import store, { authSlice } from './store';

const UserGuideBanner = () => {
  return (
    <div className="mt-3 flex flex-col justify-center w-full pr-2 mb-5">
      <p className="rounded-md bg-primary-lighter text-primary-dark text-lg font-bold italic p-3">
        Check a detailed guide on how to use this tool{' '}
        <a
          href="https://www.sentinel-hub.com/docs/UserGuide_CARD4L_Tool.pdf"
          target="__blank"
          rel="noopener noreferrer"
          className="text-green-900 underline"
        >
          here.
        </a>
      </p>
    </div>
  );
};
function App() {
  useEffect(() => {
    const fetchTokenEdc = async () => {
      try {
        let res = await Axios.post('/token_sentinel_hub');
        if (res.data && res.data.access_token) {
          store.dispatch(
            authSlice.actions.setUser({ userdata: 'EDC User', access_token: res.data.access_token }),
          );
          edcResponseInterceptor();
        } else {
          throw new Error('Token not found');
        }
      } catch (err) {
        configureNormalRetries();
        store.dispatch(authSlice.actions.setIsEdcUser(false));
      }
    };
    fetchTokenEdc();
    configureParams(getUrlParams());
  }, []);
  return (
    <div className="app">
      <Header />
      <UserGuideBanner />
      <RequestForm />
    </div>
  );
}

export default App;
