import '../css/Portal.css';

import React, { useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useMount, usePrevious, useUnmount, useUpdateEffect } from 'react-use';
import is from 'is-lite';

function createPortalElement() {
  const el = document.createElement('div');

  el.classList.add('__portal');

  return el;
}

export default function Portal(props: any) {
  const {
    children,
    closeOnClickOverlay = true,
    closeOnEsc = true,
    hideCloseButton = false,
    hideOverlay = false,
    isActive = false,
    onClose,
    onOpen,
  } = props;

  const portal = useRef(createPortalElement());

  const closePortal = useRef(() => {
    // eslint-disable-next-line no-use-before-define
    destroyPortal.current();

    if (is.function(onClose)) {
      onClose(portal.current);
    }
  });

  const destroyPortal = useRef(() => {
    if (closeOnEsc) {
      // eslint-disable-next-line no-use-before-define
      document.removeEventListener('keydown', handleKeyDown);
    }
  });

  const handleKeyDown = useCallback((e) => {
    if (e.keyCode === 27) {
      e.stopPropagation();
      closePortal.current();
    }
  }, []);

  const previousIsActive = usePrevious(isActive);
  const previousCloseOnEsc = usePrevious(closeOnEsc);

  useMount(() => {
    document.body.appendChild(portal.current);
  });

  useUnmount(() => {
    destroyPortal.current();
    document.body.removeChild(portal.current);
  });

  const openPortal = useCallback(() => {
    if (is.function(onOpen)) {
      onOpen();
    }

    if (closeOnEsc) {
      document.addEventListener('keydown', handleKeyDown);
    }
  }, [closeOnEsc, handleKeyDown, onOpen]);

  useUpdateEffect(() => {
    const hasChanged = previousIsActive !== isActive;

    if (hasChanged && isActive) {
      openPortal();
    } else if (hasChanged && !isActive) {
      destroyPortal.current();
    }

    if (previousCloseOnEsc !== closeOnEsc) {
      if (closeOnEsc) {
        document.addEventListener('keydown', handleKeyDown);
      } else {
        document.removeEventListener('keydown', handleKeyDown);
      }
    }
  }, [
    closeOnEsc,
    destroyPortal,
    handleKeyDown,
    isActive,
    openPortal,
    previousIsActive,
    previousCloseOnEsc,
  ]);

  const handleClickClose = useCallback(
    (event) => {
      const el = event.currentTarget;

      if (el.className.includes('overlay') && !closeOnClickOverlay) {
        return;
      }

      closePortal.current();
    },
    [closeOnClickOverlay, closePortal]
  );

  const content = [];

  if (isActive) {
    content.push(children);
  }

  const classes = ['wrapper'];

  if (isActive) {
    classes.push('wrapperActive');
  }

  return ReactDOM.createPortal(
    <div className={classes.join(' ')}>
      {!hideOverlay && (
        <div
          className="overlay"
          onClick={handleClickClose}
          role="presentation"
        />
      )}
      {!hideCloseButton && (
        <button
          className="closeButton"
          onClick={handleClickClose}
          title="Close"
          type="button"
        >
          close{' '}
        </button>
      )}
      <div className="content">{content}</div>
    </div>,
    portal.current
  );
}
