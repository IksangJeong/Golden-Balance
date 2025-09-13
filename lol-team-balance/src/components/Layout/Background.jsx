import React from 'react';

const Background = () => {
  return (
    <div className="lol-background">
      {/* 추가 배경 효과 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(circle at 10% 20%, rgba(12, 34, 63, 0.4) 0%, transparent 40%),
          radial-gradient(circle at 80% 80%, rgba(200, 155, 60, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(5, 150, 170, 0.1) 0%, transparent 70%)
        `,
        pointerEvents: 'none'
      }} />
      
      {/* 헥사곤 패턴 */}
      <svg style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.05,
        pointerEvents: 'none'
      }}>
        <defs>
          <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse">
            <polygon points="24.8,22 37.3,14.2 37.3,7.7 24.8,0 12.3,7.7 12.3,14.2" 
                     fill="none" 
                     stroke="#c89b3c" 
                     strokeWidth="0.5"/>
            <polygon points="49.8,22 62.3,14.2 62.3,7.7 49.8,0 37.3,7.7 37.3,14.2" 
                     fill="none" 
                     stroke="#c89b3c" 
                     strokeWidth="0.5"/>
            <polygon points="24.8,43.4 37.3,35.6 37.3,29.1 24.8,21.4 12.3,29.1 12.3,35.6" 
                     fill="none" 
                     stroke="#c89b3c" 
                     strokeWidth="0.5"/>
            <polygon points="49.8,43.4 62.3,35.6 62.3,29.1 49.8,21.4 37.3,29.1 37.3,35.6" 
                     fill="none" 
                     stroke="#c89b3c" 
                     strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexagons)" />
      </svg>
    </div>
  );
};

export default Background;