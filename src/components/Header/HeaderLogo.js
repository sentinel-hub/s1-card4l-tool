import React from 'react';

const HeaderLogo = () => {
  return (
    <>
      <img src={process.env.PUBLIC_URL + '/sentinel_hub_logo_big.png'} className="w-48 h-auto" alt="logo" />
      <h1 className="heading-primary u-margin-left-tiny">
        <i className="text-primary cursor-default font-bold ml-3">S1 CARD4L Generation Tool</i>
      </h1>
    </>
  );
};

export default HeaderLogo;
