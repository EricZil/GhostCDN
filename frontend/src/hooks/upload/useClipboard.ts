import { useState } from 'react';

export function useClipboard(timeout: number = 3000) {
  const [copied, setCopied] = useState<string | false>(false);

  const copyToClipboard = (text: string, type: string = 'main') => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(type);
      
      setTimeout(() => {
        setCopied(false);
      }, timeout);
    }
  };

  return { copied, copyToClipboard };
} 