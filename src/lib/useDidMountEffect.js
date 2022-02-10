import { useRef, useEffect } from 'react';

// like useeffect but it doesn't run on first mount.
const useDidMountEffect = (func, deps) => {
  const didMount = useRef(false);

  useEffect(() => {
    if (didMount.current) func();
    else didMount.current = true;
    // eslint-disable-next-line
  }, deps);
};

export default useDidMountEffect;
