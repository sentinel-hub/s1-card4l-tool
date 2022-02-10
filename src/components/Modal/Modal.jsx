import React, { useCallback, useState, useRef } from 'react';
import useLockBodyScroll from '../../lib/useLockBodyScroll';
import useOnClickOutside from '../../lib/useOnClickOutside';

const Modal = ({ trigger, children, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef();
  useOnClickOutside(ref, () => handleClose());
  useLockBodyScroll(isOpen);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      {trigger(handleOpen)}
      {isOpen && (
        <>
          <div className="request-preview-overlay">
            <div ref={ref} className="request-preview-overlay--container" style={style}>
              {children(handleClose)}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Modal;
