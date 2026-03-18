import React from 'react';
import { roleNames, tierColors } from '../../data/players';
import { useDraggable, useDroppable } from '@dnd-kit/core';

const PlayerSlot = ({ role, player, onRemove, teamNumber }) => {
  // 드래그 기능 (플레이어가 있을 때만)
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: player?.id || `empty-${role}`,
    disabled: !player
  });

  // 드롭 기능 (각 슬롯이 드롭 대상이 됨)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `team${teamNumber}-${role}`
  });

  // 두 ref를 합치는 함수
  const setNodeRef = (node) => {
    setDragRef(node);
    setDropRef(node);
  };

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        minHeight: '60px',
        padding: '10px',
        width: '100%',
        minWidth: '280px',
        ...(isOver && !player ? {
          borderColor: '#4CAF50',
          background: 'rgba(76, 175, 80, 0.2)',
          transform: 'scale(1.02)'
        } : {})
      }}
      {...listeners}
      {...attributes}
      className={`player-slot ${player ? 'occupied' : 'empty'} ${isDragging ? 'dragging' : ''} ${isOver ? 'drop-target' : ''}`}
    >
      <div className="role-label" style={{ minWidth: '50px', fontSize: '0.8rem', padding: '3px 8px' }}>
        {roleNames[role]}
      </div>
      
      {player ? (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flex: 1,
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '1.5rem', minWidth: '24px' }}>
              {player.championIcon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                color: '#f0e6d2', 
                fontWeight: '700',
                fontSize: '1rem',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: '4px'
              }}>
                {player.name}
              </div>
              <div className={`tier-badge ${tierColors[player.tier]}`} style={{ 
                fontSize: '0.75rem',
                padding: '3px 7px'
              }}>
                {player.tier}
              </div>
            </div>
          </div>
          
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{
                background: 'rgba(200, 53, 78, 0.8)',
                border: 'none',
                color: 'white',
                borderRadius: '2px',
                padding: '2px 4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                lineHeight: 1,
                minHeight: '24px',
                minWidth: '36px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(200, 53, 78, 1)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(200, 53, 78, 0.8)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              제거
            </button>
          )}
        </div>
      ) : (
        <div style={{ 
          color: '#6b7280', 
          fontSize: '0.9rem',
          fontStyle: 'italic',
          lineHeight: 1.2,
          display: 'flex',
          alignItems: 'center',
          flex: 1
        }}>
          비어있음
        </div>
      )}
    </div>
  );
};

export default PlayerSlot;