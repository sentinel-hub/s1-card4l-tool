import React from 'react';
import AuthHeader from './AuthHeader';
import HeaderLogo from './HeaderLogo';

const Header = () => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center">
        <HeaderLogo />
      </div>
      <div className="flex">
        <AuthHeader />
      </div>
    </div>
  );
};

export default Header;
