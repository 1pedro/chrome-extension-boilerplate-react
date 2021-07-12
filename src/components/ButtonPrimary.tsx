import React from 'react';

function ButtonPrimary(props: {
  callback: () => void;
  color?: string;
  text: string;
  width: number;
}): JSX.Element {
  const { callback, color = '636363bf', text, width } = props;

  const styles = `.btn-primary {
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    -webkit-box-direction: normal;
    box-sizing: border-box;
    font: inherit;
    margin: 0;
    overflow: visible;
    text-transform: none;
    -webkit-appearance: button;
    cursor: pointer;
    font-family: inherit;
    line-height: inherit;
    -webkit-font-smoothing: antialiased;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: center;
    justify-content: center;
    padding: 0 24px;
    font-size: 16px;
    border-radius: 50vh;
    white-space: nowrap;
    user-select: none;
    transition: all .1s ease-in-out;
    position: relative;
    border: none;
    color: #fff;
    background-color: #${color};
    height: 42px;
    display: block;
    width: ${width}px;
    padding-left: 0;
    padding-right: 0;
    font-weight: 600;
    }`;

  return (
    <>
      <style>{styles}</style>

      {/* eslint-disable-next-line react/button-has-type */}
      <button className="btn-primary" onClick={() => callback()}>
        {text}
      </button>
    </>
  );
}

export default ButtonPrimary;
