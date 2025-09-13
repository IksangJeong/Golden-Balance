import React from 'react';
import { tierColors, roleNames, calculateTotalSkillScore, calculateRoleScore } from '../../data/players';
import { useDraggable } from '@dnd-kit/core';

const PlayerCard = ({ player, onAssign, onRemove, showAssignButtons }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Calculate scores for display
  const skillScore = calculateTotalSkillScore(player);
  const roleScore = calculateRoleScore(player);
  const totalScore = skillScore + roleScore;

  // Format tier display with LP
  const tierDisplay = player.tier === 'UNRANKED' ? 'UNRANKED' :
    `${player.tier}${player.division ? ` ${player.division}` : ''}${player.lp ? ` ${player.lp}LP` : ''}`;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '10px',
        minHeight: '70px',
        minWidth: '0',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
      className={`player-card ${isDragging ? 'dragging' : ''}`}
    >
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}
        {...listeners}
        {...attributes}
      >
        {/* Champion Icon */}
        <span style={{ fontSize: '1.1rem', minWidth: '18px', marginTop: '2px' }}>
          {player.championIcon}
        </span>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name and API Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', minWidth: '0' }}>
            <div style={{
              color: '#f0e6d2',
              fontWeight: '600',
              fontSize: '0.9rem',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: '0',
              maxWidth: '250px'
            }}>
              {player.name}
            </div>
            {player.isFromAPI && (
              <span style={{
                color: '#0596aa',
                fontSize: '0.6rem',
                backgroundColor: 'rgba(5, 150, 170, 0.2)',
                padding: '1px 3px',
                borderRadius: '2px',
                lineHeight: 1
              }}>
                API
              </span>
            )}
          </div>

          {/* Tier and Role */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '3px' }}>
            <span className={`tier-badge ${tierColors[player.tier]}`} style={{
              fontSize: '0.6rem',
              padding: '1px 4px',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}>
              {tierDisplay}
            </span>
            <span style={{
              color: '#c89b3c',
              fontSize: '0.65rem',
              fontWeight: '400',
              lineHeight: 1
            }}>
              {roleNames[player.mainRole]}
            </span>
          </div>

          {/* Skill Scores */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            marginBottom: '4px',
            flexWrap: 'wrap',
            minWidth: '0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(205, 190, 145, 0.1)',
              padding: '3px 6px',
              borderRadius: '4px',
              minWidth: 'auto',
              flex: '0 0 auto'
            }}>
              <span style={{ color: '#cdbe91', fontSize: '0.65rem', fontWeight: '500' }}>
                스킬:
              </span>
              <span style={{ color: '#f0e6d2', fontSize: '0.7rem', fontWeight: '600' }}>
                {skillScore}
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(205, 190, 145, 0.1)',
              padding: '3px 6px',
              borderRadius: '4px',
              minWidth: 'auto',
              flex: '0 0 auto'
            }}>
              <span style={{ color: '#cdbe91', fontSize: '0.65rem', fontWeight: '500' }}>
                포지션:
              </span>
              <span style={{ color: '#f0e6d2', fontSize: '0.7rem', fontWeight: '600' }}>
                {roleScore}
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(205, 190, 145, 0.15)',
              padding: '3px 6px',
              borderRadius: '4px',
              minWidth: 'auto',
              flex: '0 0 auto',
              border: '1px solid rgba(205, 190, 145, 0.3)'
            }}>
              <span style={{ color: '#cdbe91', fontSize: '0.65rem', fontWeight: '500' }}>
                총합:
              </span>
              <span style={{
                color: totalScore >= 120 ? '#0ec776' : totalScore >= 100 ? '#c89b3c' : '#f0e6d2',
                fontSize: '0.7rem',
                fontWeight: '700'
              }}>
                {totalScore}
              </span>
            </div>
          </div>

          {/* Performance Stats */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            fontSize: '0.65rem',
            flexWrap: 'wrap',
            minWidth: '0'
          }}>
            <span style={{ color: '#cdbe91', whiteSpace: 'nowrap' }}>
              {player.avgKDA?.toFixed(1)} KDA
            </span>
            <span style={{ color: '#cdbe91', whiteSpace: 'nowrap' }}>
              {player.winRate}% WR
            </span>
            {player.csPerMin && (
              <span style={{ color: '#cdbe91', whiteSpace: 'nowrap' }}>
                {player.csPerMin.toFixed(1)} CS/m
              </span>
            )}
            {player.recentWinRate !== player.winRate && (
              <span style={{
                color: player.recentWinRate > player.winRate ? '#0ec776' : '#e74c3c',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}>
                최근{player.recentWinRate}%
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center', minWidth: '60px', justifyContent: 'flex-end' }}>
        {showAssignButtons && onAssign && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAssign(player, 1);
              }}
              style={{
                background: 'linear-gradient(135deg, #0c223f, #0596aa)',
                border: '1px solid #0596aa',
                color: 'white',
                borderRadius: '2px',
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                lineHeight: 1,
                minHeight: '20px',
                minWidth: '28px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              1팀
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAssign(player, 2);
              }}
              style={{
                background: 'linear-gradient(135deg, #5c3a8e, #8b5cf6)',
                border: '1px solid #8b5cf6',
                color: 'white',
                borderRadius: '2px',
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                lineHeight: 1,
                minHeight: '20px',
                minWidth: '28px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              2팀
            </button>
          </>
        )}
        
        {!showAssignButtons && onAssign && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssign(player);
            }}
            style={{
              background: 'linear-gradient(135deg, #785a28, #c89b3c)',
              border: '1px solid #c89b3c',
              color: 'white',
              borderRadius: '2px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontWeight: '600',
              transition: 'all 0.2s',
              lineHeight: 1,
              minHeight: '20px',
              minWidth: '30px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
            }}
          >
            추가
          </button>
        )}
        
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(player.id);
            }}
            style={{
              background: 'rgba(200, 53, 78, 0.8)',
              border: 'none',
              color: 'white',
              borderRadius: '2px',
              padding: '2px 4px',
              cursor: 'pointer',
              fontSize: '0.65rem',
              transition: 'all 0.2s',
              lineHeight: 1,
              minHeight: '20px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(200, 53, 78, 1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(200, 53, 78, 0.8)';
            }}
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;