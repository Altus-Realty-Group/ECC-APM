import {} from '@/lib/ecc-resolvers';
import React from 'react';

let FileButtons: any;
try { 
  FileButtons = require('@/components/FileButtons').default; 
} catch {
  // FileButtons component not available
}

export default function Files() {
  return (
    <div className="space-y-3" data-testid="tab-files">
      <div className="text-sm opacity-70">File listing is not available on this card yet.</div>
    </div>
  );
}