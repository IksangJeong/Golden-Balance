import React from 'react';

const Header = () => {
  return (
    <header style={{
      background: 'linear-gradient(180deg, rgba(10, 20, 40, 0.95) 0%, rgba(5, 10, 20, 0.8) 100%)',
      borderBottom: '2px solid #c89b3c',
      padding: '15px',
      textAlign: 'center',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '900',
        background: 'linear-gradient(135deg, #f0e6d2 0%, #c89b3c 50%, #f0e6d2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        margin: 0
      }}>
        Golden Balance
      </h1>
      <p style={{
        color: '#c89b3c',
        fontSize: '0.9rem',
        marginTop: '5px',
        letterSpacing: '1px'
      }}>
        학생회 LOL 팀 밸런싱 시스템
      </p>
    </header>
  );
};

export default Header;