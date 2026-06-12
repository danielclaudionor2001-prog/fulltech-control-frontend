import React from 'react';

export default function BrandLoader({ label = 'Carregando...' }) {
  return (
    <div className="brand-loader">
      <div className="brand-loader-row">
        <div className="session-spinner" aria-hidden="true" />
        <img
          alt="Fulltech Elevadores"
          className="brand-loader-logo"
          src="/brand/fulltech-wordmark.png"
        />
      </div>
      <p>{label}</p>
    </div>
  );
}
