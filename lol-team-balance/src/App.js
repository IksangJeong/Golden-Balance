import React, { useState, useEffect } from 'react';
import './styles/globals.css';
import './styles/lol-theme.css';
import Header from './components/Layout/Header';
import Background from './components/Layout/Background';
import TeamColumn from './components/TeamBuilder/TeamColumn';
import SelectedPlayers from './components/TeamBuilder/UnassignedPlayers';
import PlayerPool from './components/TeamBuilder/PlayerPool';
import AddPlayerModal from './components/PlayerManagement/AddPlayerModal';
import { balanceTeams } from './utils/teamBalancer';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';

function App() {
  const [allPlayers, setAllPlayers] = useState([]); // 전체 플레이어 DB
  const [selectedPlayers, setSelectedPlayers] = useState([]); // 게임에 참여할 플레이어들
  const [team1, setTeam1] = useState([]);
  const [team2, setTeam2] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [balanceResult, setBalanceResult] = useState(null);
  const [activeId, setActiveId] = useState(null);

  // 초기 플레이어 로드
  useEffect(() => {
    const storedPlayers = localStorage.getItem('lolAllPlayers');
    if (storedPlayers) {
      const parsed = JSON.parse(storedPlayers);
      setAllPlayers(parsed);
    }
    // 하드코딩된 데이터 제거 - 사용자가 직접 플레이어를 추가하도록 변경
  }, []);

  // 새 플레이어 추가 (전체 DB에)
  const handleAddPlayer = (newPlayer) => {
    const playerWithId = {
      ...newPlayer,
      id: `p${Date.now()}`,
      skillScore: calculateSkillScore(newPlayer.tierLevel)
    };
    
    const updatedAllPlayers = [...allPlayers, playerWithId];
    setAllPlayers(updatedAllPlayers);
    localStorage.setItem('lolAllPlayers', JSON.stringify(updatedAllPlayers));
  };

  // 플레이어를 게임에 추가
  const handleAddToGame = (player) => {
    if (selectedPlayers.length >= 10) {
      alert('최대 10명까지만 참여할 수 있습니다.');
      return;
    }
    
    if (selectedPlayers.some(p => p.id === player.id)) {
      alert('이미 참여 중인 플레이어입니다.');
      return;
    }
    
    setSelectedPlayers([...selectedPlayers, player]);
  };

  // 티어 레벨로 스킬 점수 계산
  const calculateSkillScore = (tierLevel) => {
    return Math.min(100, tierLevel * 10 + Math.random() * 5);
  };

  // 전체 DB에서 플레이어 삭제
  const handleRemovePlayer = (playerId) => {
    const updatedAllPlayers = allPlayers.filter(p => p.id !== playerId);
    setAllPlayers(updatedAllPlayers);
    localStorage.setItem('lolAllPlayers', JSON.stringify(updatedAllPlayers));
    
    // 게임 참여 목록에서도 제거
    setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
    setTeam1(team1.filter(p => p.id !== playerId));
    setTeam2(team2.filter(p => p.id !== playerId));
    setBalanceResult(null);
  };

  // 게임 참여 목록에서 제거
  const handleRemoveFromGame = (playerId) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
    setTeam1(team1.filter(p => p.id !== playerId));
    setTeam2(team2.filter(p => p.id !== playerId));
    setBalanceResult(null);
  };

  // 팀에 플레이어 추가 (드래그 앤 드롭)
  const handleAssignPlayer = (player, teamNumber) => {
    if (teamNumber === 1 && team1.length < 5) {
      setTeam1([...team1, { ...player, assignedRole: 'TOP' }]); // 임시로 TOP 할당
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    } else if (teamNumber === 2 && team2.length < 5) {
      setTeam2([...team2, { ...player, assignedRole: 'TOP' }]); // 임시로 TOP 할당
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    }
    setBalanceResult(null);
  };

  // 팀에서 플레이어 제거
  const handleUnassignPlayer = (player, teamNumber) => {
    if (teamNumber === 1) {
      setTeam1(team1.filter(p => p.id !== player.id));
    } else {
      setTeam2(team2.filter(p => p.id !== player.id));
    }
    setSelectedPlayers([...selectedPlayers, player]);
    setBalanceResult(null);
  };

  // 팀 밸런싱
  const handleBalanceTeams = () => {
    const totalPlayers = [...team1, ...team2, ...selectedPlayers];
    
    if (totalPlayers.length < 10) {
      alert(`현재 ${totalPlayers.length}명입니다. 10명이 필요합니다.`);
      return;
    }

    const playersToBalance = totalPlayers.slice(0, 10);
    const result = balanceTeams(playersToBalance);
    
    if (result) {
      setTeam1(result.team1);
      setTeam2(result.team2);
      setSelectedPlayers([]);
      setBalanceResult(result);
    }
  };

  // 팀 초기화
  const handleResetTeams = () => {
    const allGamePlayers = [...team1, ...team2, ...selectedPlayers];
    setTeam1([]);
    setTeam2([]);
    setSelectedPlayers(allGamePlayers);
    setBalanceResult(null);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedPlayer = [...selectedPlayers, ...team1, ...team2].find(
      p => p.id === active.id
    );

    if (!draggedPlayer) return;

    // 드롭 대상 확인
    if (over.id === 'team1') {
      if (selectedPlayers.some(p => p.id === draggedPlayer.id)) {
        handleAssignPlayer(draggedPlayer, 1);
      } else if (team2.some(p => p.id === draggedPlayer.id)) {
        handleUnassignPlayer(draggedPlayer, 2);
        handleAssignPlayer(draggedPlayer, 1);
      }
    } else if (over.id === 'team2') {
      if (selectedPlayers.some(p => p.id === draggedPlayer.id)) {
        handleAssignPlayer(draggedPlayer, 2);
      } else if (team1.some(p => p.id === draggedPlayer.id)) {
        handleUnassignPlayer(draggedPlayer, 1);
        handleAssignPlayer(draggedPlayer, 2);
      }
    } else if (over.id === 'selected') {
      if (team1.some(p => p.id === draggedPlayer.id)) {
        handleUnassignPlayer(draggedPlayer, 1);
      } else if (team2.some(p => p.id === draggedPlayer.id)) {
        handleUnassignPlayer(draggedPlayer, 2);
      }
    }
  };

  const assignedCount = team1.length + team2.length;
  const totalGamePlayers = assignedCount + selectedPlayers.length;

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="lol-container">
        <Background />
        
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          <Header />
          
          <div style={{ padding: '15px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* 상단 정보 및 버튼 */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px',
              padding: '15px',
              background: 'rgba(10, 20, 40, 0.7)',
              borderRadius: '12px',
              border: '1px solid rgba(200, 155, 60, 0.3)'
            }}>
              <div className="header-info">
                <div style={{
                  color: '#f0e6d2',
                  fontSize: '1.2rem',
                  fontWeight: '700'
                }}>
                  인원 ({totalGamePlayers}/10)
                </div>
                {balanceResult && (
                  <div className={`balance-indicator ${
                    balanceResult.overallBalance === '황벨' ? 'golden' :
                    balanceResult.overallBalance === '맞벨' ? 'fair' : 'poor'
                  }`}>
                    전체 밸런스: {balanceResult.overallBalance}
                  </div>
                )}
              </div>

              <div className="header-buttons">
                <button 
                  className="lol-button"
                  onClick={() => setShowAddModal(true)}
                >
                  인원 추가
                </button>
                <button 
                  className="lol-button"
                  onClick={handleBalanceTeams}
                  disabled={totalGamePlayers < 10}
                  style={{
                    background: totalGamePlayers >= 10 ? 
                      'linear-gradient(135deg, #785a28 0%, #c89b3c 100%)' : 
                      'linear-gradient(135deg, #1e2328 0%, #0c1f3d 100%)'
                  }}
                >
                  {totalGamePlayers >= 10 ? '팀 짜기' : `팀 짜기 (${10 - totalGamePlayers}명 더 필요)`}
                </button>
                <button 
                  className="lol-button"
                  onClick={handleResetTeams}
                >
                  초기화
                </button>
              </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="main-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 1fr 300px 300px',
              gap: '10px',
              height: 'calc(100vh - 220px)'
            }}>
              <TeamColumn 
                teamNumber={1}
                players={team1}
                onRemovePlayer={(player) => handleUnassignPlayer(player, 1)}
                balanceInfo={null}
              />
              
              {/* 가운데 벨런스 표시 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                padding: '80px 0 0 0'
              }}>
                {balanceResult?.balance && ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'].map(role => {
                  const balance = balanceResult.balance[role];
                  return balance ? (
                    <div key={role} style={{
                      marginBottom: '8px',
                      textAlign: 'center',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div className={`balance-indicator ${
                        balance.grade === '황벨' ? 'golden' :
                        balance.grade === '맞벨' ? 'fair' : 'poor'
                      }`} style={{
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        borderRadius: '4px',
                        lineHeight: '1',
                        whiteSpace: 'nowrap',
                        marginBottom: '2px'
                      }}>
                        {balance.grade}
                      </div>
                      <div style={{
                        fontSize: '0.6rem',
                        color: '#c89b3c',
                        lineHeight: '1'
                      }}>
                        {balance.skillDiff}% 차이
                      </div>
                    </div>
                  ) : (
                    <div key={role} style={{
                      marginBottom: '8px',
                      minHeight: '80px'
                    }}></div>
                  );
                })}
              </div>
              
              <TeamColumn 
                teamNumber={2}
                players={team2}
                onRemovePlayer={(player) => handleUnassignPlayer(player, 2)}
                balanceInfo={null}
              />
              
              <SelectedPlayers
                players={selectedPlayers}
                onAssignPlayer={handleAssignPlayer}
                onRemoveFromGame={handleRemoveFromGame}
              />

              <PlayerPool
                allPlayers={allPlayers}
                selectedPlayers={selectedPlayers}
                onAddToGame={handleAddToGame}
                onRemovePlayer={handleRemovePlayer}
              />
            </div>
          </div>
        </div>

        {showAddModal && (
          <AddPlayerModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddPlayer}
          />
        )}

        <DragOverlay>
          {activeId ? (
            <div style={{ 
              cursor: 'grabbing',
              opacity: 0.8
            }}>
              드래그 중...
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default App;