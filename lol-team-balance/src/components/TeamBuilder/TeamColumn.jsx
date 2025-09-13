import React from 'react';
import PlayerSlot from './PlayerSlot';
import { useDroppable } from '@dnd-kit/core';

const TeamColumn = ({ teamNumber, players, onRemovePlayer }) => {
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  
  const { setNodeRef } = useDroppable({
    id: `team${teamNumber}`
  });

  // 역할별로 플레이어 매핑
  const playersByRole = {};
  players.forEach(player => {
    if (player.assignedRole) {
      playersByRole[player.assignedRole] = player;
    }
  });

  return (
    <div ref={setNodeRef} className="team-column" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="team-column-header">
        {teamNumber}팀
      </div>
      
      <div style={{ padding: '10px', flex: '1', overflowY: 'visible', display: 'flex', flexDirection: 'column' }}>
        {roles.map(role => {
          const player = playersByRole[role];
          
          return (
            <div key={role} style={{ marginBottom: '8px' }}>
              <PlayerSlot
                role={role}
                player={player || players.find(p => !p.assignedRole && (p.mainRole === role || p.subRole === role))}
                onRemove={player ? () => onRemovePlayer(player) : null}
              />
            </div>
          );
        })}
      </div>
      
      <div style={{
        marginTop: '15px',
        padding: '15px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px'
      }}>
        <div style={{ 
          color: '#c89b3c',
          fontSize: '0.9rem',
          marginBottom: '5px',
          lineHeight: 1.3
        }}>
          팀 총합 스킬: {players.reduce((sum, p) => sum + (p.skillScore || 0), 0).toFixed(0)}
        </div>
        <div style={{ 
          color: '#f0e6d2',
          fontSize: '0.8rem',
          lineHeight: 1.3
        }}>
          인원: {players.length}/5
        </div>
      </div>
    </div>
  );
};

export default TeamColumn;