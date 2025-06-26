import { useState, useEffect } from 'react';

interface AnimationState {
  overlay: boolean;
  container: boolean;
}

export function useUploadAnimation(isOpen: boolean) {
  const [animationState, setAnimationState] = useState<AnimationState>({
    overlay: false,
    container: false
  });

  useEffect(() => {
    let overlayTimer: NodeJS.Timeout;
    let containerTimer: NodeJS.Timeout;
    
    if (isOpen) {
      overlayTimer = setTimeout(() => setAnimationState(prev => ({ ...prev, overlay: true })), 10);
      containerTimer = setTimeout(() => setAnimationState(prev => ({ ...prev, container: true })), 150);
    } else {
      setAnimationState({ overlay: false, container: false });
    }
    
    return () => {
      clearTimeout(overlayTimer);
      clearTimeout(containerTimer);
    };
  }, [isOpen]);

  return animationState;
} 