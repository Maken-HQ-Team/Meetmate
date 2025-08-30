import React from 'react';

interface WhatsAppTicksProps {
  status: 'sent' | 'delivered' | 'read';
  className?: string;
}

export const WhatsAppTicks: React.FC<WhatsAppTicksProps> = ({ status, className = "" }) => {
  if (status === 'sent') {
    return (
      <svg className={`w-4 h-4 ${className}`} viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.5 10.5L3.5 7.5L2.5 8.5L6.5 12.5L13.5 5.5L12.5 4.5L6.5 10.5Z"/>
      </svg>
    );
  }

  if (status === 'delivered' || status === 'read') {
    return (
      <svg className={`w-4 h-4 ${className}`} viewBox="0 0 16 16" fill="currentColor">
        <path d="M4.5 8.5L1.5 5.5L0.5 6.5L4.5 10.5L11.5 3.5L10.5 2.5L4.5 8.5Z"/>
        <path d="M8.5 8.5L5.5 5.5L4.5 6.5L8.5 10.5L15.5 3.5L14.5 2.5L8.5 8.5Z"/>
      </svg>
    );
  }

  return null;
};