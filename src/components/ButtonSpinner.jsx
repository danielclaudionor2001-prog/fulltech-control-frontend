import React from 'react';

export default function ButtonSpinner({ className = '' }) {
  return <span aria-hidden="true" className={`button-spinner ${className}`.trim()} />;
}
