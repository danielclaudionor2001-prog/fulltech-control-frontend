import React from 'react';

export default function SkeletonBlock({ className = '' }) {
  return <span aria-hidden="true" className={`skeleton-block ${className}`.trim()} />;
}
