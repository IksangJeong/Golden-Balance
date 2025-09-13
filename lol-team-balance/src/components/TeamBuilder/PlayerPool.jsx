import React from 'react';
import PlayerCard from '../PlayerManagement/PlayerCard';

const PlayerPool = ({ allPlayers, selectedPlayers, onAddToGame, onRemovePlayer }) => {
  // 게임에 참여하지 않은 플레이어들
  const availablePlayers = allPlayers.filter(player => 
    !selectedPlayers.some(selected => selected.id === player.id)
  );

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(10, 20, 40, 0.9) 0%, rgba(5, 10, 20, 0.9) 100%)',
      border: '2px solid rgba(200, 155, 60, 0.3)',
      borderRadius: '12px',
      padding: '15px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'visible'
    }}>
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
        전체 플레이어
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
        총 {allPlayers.length}명 등록됨
      </div>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: '1',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: '8px',
        maxHeight: '400px'
      }}>
        {availablePlayers.length > 0 ? (
          availablePlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onAssign={onAddToGame}
              onRemove={onRemovePlayer}
              showAssignButtons={false}
            />
          ))
        ) : (
          <div style={{
            color: '#6b7280',
            textAlign: 'center',
            padding: '40px 20px',
            fontStyle: 'italic'
          }}>
            모든 플레이어가 게임에 참여 중입니다
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerPool;