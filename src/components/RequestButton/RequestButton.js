import React, { useRef, useEffect, useState, useCallback } from 'react';
import Axios from 'axios';
import Mousetrap from 'mousetrap';
//Abstraction of button that sends a request. To be implemented on the main Send Request (ProcessAPI)
const RequestButton = ({
  buttonText,
  request,
  args,
  validation,
  className,
  responseHandler,
  errorHandler,
  disabledTitle,
  useShortcut,
  title,
  isListOfPromises,
  maxRetries,
}) => {
  const [isFetching, setIsFetching] = useState(false);
  const sourceRef = useRef();

  useEffect(() => {
    return () => {
      Mousetrap.reset();
      if (sourceRef.current) {
        sourceRef.current.cancel();
      }
    };
  }, []);

  const handleSendRequest = useCallback(async () => {
    if (isFetching) {
      sourceRef.current.cancel();
    } else {
      try {
        setIsFetching(true);
        sourceRef.current = Axios.CancelToken.source();
        const reqConfig = {
          cancelToken: sourceRef.current.token,
        };
        if (maxRetries) {
          reqConfig.maxRetries = maxRetries;
        }
        if (isListOfPromises) {
          let listOfPromises = await request(...args, reqConfig);
          const res = await Promise.all(listOfPromises);
          setIsFetching(false);
          responseHandler(res);
        } else {
          const res = await request(...args, reqConfig);
          if (res && (res.data || res.status === 204)) {
            setIsFetching(false);
            responseHandler(res.data);
          }
          // suport allSettled type response
          else if (res.fulfilled !== undefined) {
            setIsFetching(false);
            responseHandler(res);
          }
        }
      } catch (err) {
        setIsFetching(false);
        if (errorHandler) {
          errorHandler(err);
        } else {
          console.error(err);
        }
      }
    }
  }, [isFetching, args, request, errorHandler, responseHandler, isListOfPromises, maxRetries]);

  //Mousetrap effect, binds
  useEffect(() => {
    if (useShortcut) {
      Mousetrap.bind('ctrl+enter', () => {
        if (validation) {
          handleSendRequest();
        }
      });
      //Prevent default behaviour allowing using shortcuts in forms, textareas, etc.
      Mousetrap.prototype.stopCallback = () => false;
    }
  }, [useShortcut, handleSendRequest, validation]);

  const generateClassName = () => {
    if (!validation) {
      return className + '--disabled';
    } else if (validation && isFetching) {
      return className + '--cancel';
    } else if (validation && !isFetching) {
      return className + '--active';
    }
  };

  return (
    <button
      className={`${className} ${generateClassName()}`}
      disabled={!validation}
      onClick={handleSendRequest}
      title={!validation ? disabledTitle : title}
    >
      {isFetching ? 'Cancel Request' : buttonText}
    </button>
  );
};

export default RequestButton;
