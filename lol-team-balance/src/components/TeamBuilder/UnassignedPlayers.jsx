import React from 'react';
import PlayerCard from '../PlayerManagement/PlayerCard';
import { useDroppable } from '@dnd-kit/core';

const SelectedPlayers = ({ players, onAssignPlayer, onRemoveFromGame }) => {
  const { setNodeRef } = useDroppable({
    id: 'selected'
  });

  return (
    <div 
      ref={setNodeRef}
      style={{
        background: 'linear-gradient(180deg, rgba(10, 20, 40, 0.9) 0%, rgba(5, 10, 20, 0.9) 100%)',
        border: '2px solid rgba(200, 155, 60, 0.3)',
        borderRadius: '12px',
        padding: '15px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'visible'
      }}
    >
      <div style={{
        background: 'linear-gradient(90deg, #785a28 0%, #c89b3c 50%, #785a28 100%)',
        color: '#010a13',
        padding: '10px',
        textAlign: 'center',
        fontWeight: '900',
        fontSize: '1.1rem',
        letterSpacing: '1px',
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        참여 인원
      </div>
      
      <div style={{
        color: '#c89b3c',
        fontSize: '0.9rem',
        marginBottom: '10px',
        textAlign: 'center',
        padding: '8px',
        background: 'rgba(200, 155, 60, 0.1)',
        borderRadius: '6px'
      }}>
        {players.length}/10명 참여중
      </div>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: '1',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: '4px',
        maxHeight: 'calc(100vh - 400px)', // 화면 높이에 따라 동적 조정
        minHeight: '200px', // 최소 높이 보장
        scrollbarWidth: 'thin', // Firefox용 얇은 스크롤바
        scrollbarColor: '#c89b3c rgba(10, 20, 40, 0.3)' // Firefox용 스크롤바 색상
      }}
      className="custom-scrollbar"
      >
        {players.length > 0 ? (
          players.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onAssign={onAssignPlayer}
              onRemove={onRemoveFromGame}
              showAssignButtons={true}
            />
          ))
        ) : (
          <div style={{
            color: '#6b7280',
            textAlign: 'center',
            padding: '40px 20px',
            fontStyle: 'italic'
          }}>
            게임 참여자를 선택해주세요
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectedPlayers;