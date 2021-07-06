import './Panel.scss';

import React from 'react';

function Modal() {
  return (
    <div className="wrapper">
      <div
        id="edit-area"
        style={{ display: status === 'isCropping' ? 'block' : 'none' }}
      >
        {' '}
      </div>
      {status === 'isCropping' && <></>}

      {status === 'isAnalyzing' && <></>}
    </div>
  );
}

export default Modal;
// if (module.hot) module.hot.accept();
