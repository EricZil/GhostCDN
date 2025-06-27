import { useEffect, useRef, ReactNode } from 'react';

interface AnimatedGradientBorderProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

export default function AnimatedGradientBorder({
  children,
  className = '',
  containerClassName = '',
}: AnimatedGradientBorderProps) {
  const gradientRef = useRef<HTMLDivElement>(null);
  const blurGradientRef = useRef<HTMLDivElement>(null);
  
  // Animate gradient background
  useEffect(() => {
    const gradientElement = gradientRef.current;
    const blurGradientElement = blurGradientRef.current;
    if (!gradientElement || !blurGradientElement) return;
    
    let startTime: number;
    let animationFrameId: number;
    
    const animateGradient = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Calculate position (0 to 100 and back)
      const duration = 6000; // 6 seconds
      const progress = (elapsed % (duration * 2)) / duration;
      const position = progress <= 1 ? progress * 100 : 200 - (progress * 100);
      
      // Update background position
      const backgroundPos = `${position}% 50%`;
      gradientElement.style.backgroundPosition = backgroundPos;
      blurGradientElement.style.backgroundPosition = backgroundPos;
      
      animationFrameId = requestAnimationFrame(animateGradient);
    };
    
    animationFrameId = requestAnimationFrame(animateGradient);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`relative p-[4px] group ${containerClassName}`}>
      {/* Blurred gradient background */}
      <div 
        ref={blurGradientRef}
        className="absolute inset-0 rounded-xl opacity-70 group-hover:opacity-100 blur-2xl transition-opacity duration-500"
        style={{
          backgroundSize: '400% 400%',
          backgroundImage: 'radial-gradient(circle farthest-side at 0 100%, #00ccb1, transparent), radial-gradient(circle farthest-side at 100% 0, #7b61ff, transparent), radial-gradient(circle farthest-side at 100% 100%, #ffc414, transparent), radial-gradient(circle farthest-side at 0 0, #1ca0fb, #141316)'
        }}
      ></div>
      
      {/* Sharp gradient border */}
      <div 
        ref={gradientRef}
        className="absolute inset-0 rounded-xl"
        style={{
          backgroundSize: '400% 400%',
          backgroundImage: 'radial-gradient(circle farthest-side at 0 100%, #00ccb1, transparent), radial-gradient(circle farthest-side at 100% 0, #7b61ff, transparent), radial-gradient(circle farthest-side at 100% 100%, #ffc414, transparent), radial-gradient(circle farthest-side at 0 0, #1ca0fb, #141316)'
        }}
      ></div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-60 blur-xl transition-opacity duration-500"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(124, 58, 237, 0.5) 0%, transparent 70%)',
        }}
      ></div>
      
      {/* Content container */}
      <div className={`relative z-10 rounded-lg overflow-hidden ${className}`}>
        {children}
      </div>
    </div>
  );
} 