import React, { useState } from 'react';
import { roleNames, createPlayerProfile } from '../../data/players';
import { RiotAPI } from '../../services/riotAPI';

const EditPlayerModal = ({ player, onClose, onSave }) => {
  // 현재 플레이어 데이터로 폼 초기화
  const [formData, setFormData] = useState({
    name: player.name || '',
    summonerName: player.summonerName || '',
    tier: player.tier || 'GOLD',
    division: player.division || 'I',
    lp: player.lp || 0,
    winRate: player.winRate || 50,
    recentWinRate: player.recentWinRate || player.winRate || 50,
    avgKDA: player.avgKDA || 2.0,
    csPerMin: player.csPerMin || 5.5,
    visionScorePerMin: player.visionScorePerMin || 1.2,
    teamContribution: player.teamContribution || 50,
    mainRole: player.mainRole || 'TOP',
    subRole: player.subRole || 'MID',
    roleProficiency: player.roleProficiency || {
      TOP: 5,
      JUNGLE: 5,
      MID: 5,
      ADC: 5,
      SUPPORT: 5
    },
    championIcon: player.championIcon || '🎮'
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  const tiers = [
    { value: 'CHALLENGER', name: '챌린저' },
    { value: 'GRANDMASTER', name: '그랜드마스터' },
    { value: 'MASTER', name: '마스터' },
    { value: 'DIAMOND', name: '다이아몬드' },
    { value: 'EMERALD', name: '에메랄드' },
    { value: 'PLATINUM', name: '플래티넘' },
    { value: 'GOLD', name: '골드' },
    { value: 'SILVER', name: '실버' },
    { value: 'BRONZE', name: '브론즈' },
    { value: 'IRON', name: '아이언' },
    { value: 'UNRANKED', name: '언랭크' }
  ];

  const divisions = ['I', 'II', 'III', 'IV'];
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  const championIcons = [
    '🗡️', '🏹', '🔮', '🎯', '🛡️', '⚔️', '✨', '🌿',
    '💫', '🔱', '🎭', '⚡', '🔥', '❄️', '🌊', '🎮'
  ];

  // API 업데이트 함수
  const handleAPIUpdate = async () => {
    if (!player.summonerName && !formData.summonerName) {
      alert('Riot ID를 입력해주세요.');
      return;
    }

    setIsUpdating(true);
    setUpdateResult(null);

    try {
      const riotId = formData.summonerName || player.summonerName;
      const result = await RiotAPI.updatePlayerData({ ...player, summonerName: riotId });

      if (result.success) {
        const updatedProfile = result.data;

        // 폼 데이터에 API 결과 적용
        setFormData({
          ...formData,
          tier: updatedProfile.tier,
          division: updatedProfile.division,
          lp: updatedProfile.lp,
          winRate: updatedProfile.winRate,
          recentWinRate: updatedProfile.recentWinRate,
          avgKDA: updatedProfile.avgKDA,
          csPerMin: updatedProfile.csPerMin,
          visionScorePerMin: updatedProfile.visionScorePerMin,
          teamContribution: updatedProfile.teamContribution,
          mainRole: updatedProfile.mainRole,
          subRole: updatedProfile.subRole,
          roleProficiency: updatedProfile.roleProficiency
        });

        setUpdateResult({
          success: true,
          message: '데이터를 성공적으로 업데이트했습니다!'
        });
      } else {
        setUpdateResult({
          success: false,
          message: result.error
        });
      }
    } catch (error) {
      setUpdateResult({
        success: false,
        message: '업데이트 중 오류가 발생했습니다.'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    // 기존 플레이어 데이터와 병합하여 업데이트된 프로필 생성
    const updatedProfile = createPlayerProfile({
      ...player,
      ...formData,
      id: player.id, // ID는 변경하지 않음
      lastUpdated: new Date().toISOString().split('T')[0]
    });

    onSave(updatedProfile);
    onClose();
  };

  const updateRoleProficiency = (role, value) => {
    setFormData({
      ...formData,
      roleProficiency: {
        ...formData.roleProficiency,
        [role]: parseInt(value)
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
        maxWidth: '600px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2 style={{
          color: '#c89b3c',
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '1.5rem',
          fontWeight: '700'
        }}>
          플레이어 편집: {player.name}
        </h2>

        {/* API 업데이트 섹션 */}
        <div style={{
          background: 'rgba(10, 20, 40, 0.7)',
          padding: '15px',
          borderRadius: '10px',
          border: '1px solid rgba(200, 155, 60, 0.3)',
          marginBottom: '20px'
        }}>
          <h3 style={{
            color: '#c89b3c',
            marginBottom: '10px',
            fontSize: '1rem'
          }}>
            🔄 데이터 업데이트
          </h3>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={handleAPIUpdate}
              disabled={isUpdating}
              className="lol-button"
              style={{
                background: isUpdating ?
                  'linear-gradient(135deg, #374151, #1f2937)' :
                  'linear-gradient(135deg, #c89b3c, #785a28)'
              }}
            >
              {isUpdating ? '🔄 업데이트 중...' : '🔄 최신 데이터 가져오기'}
            </button>
          </div>

          {updateResult && (
            <div style={{
              color: updateResult.success ? '#10b981' : '#ef4444',
              background: updateResult.success ?
                'rgba(16, 185, 129, 0.1)' :
                'rgba(239, 68, 68, 0.1)',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              border: `1px solid ${updateResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {updateResult.success ? '✅' : '❌'} {updateResult.message}
            </div>
          )}

          <div style={{
            fontSize: '0.8rem',
            color: '#9ca3af',
            marginTop: '8px'
          }}>
            💡 현재 Riot ID로 최신 게임 데이터를 자동으로 가져옵니다.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 기본 정보 */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#c89b3c', marginBottom: '15px', fontSize: '1rem' }}>
              기본 정보
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  color: '#f0e6d2',
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '0.9rem'
                }}>
                  플레이어 이름
                </label>
                <input
                  type="text"
                  className="lol-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="표시될 이름"
                />
              </div>

              <div>
                <label style={{
                  color: '#f0e6d2',
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '0.9rem'
                }}>
                  Riot ID
                </label>
                <input
                  type="text"
                  className="lol-input"
                  value={formData.summonerName}
                  onChange={(e) => setFormData({ ...formData, summonerName: e.target.value })}
                  placeholder="게임명#태그 (예: Player#KR1)"
                />
              </div>
            </div>

            {/* 랭크 정보 */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  color: '#f0e6d2',
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '0.9rem'
                }}>
                  티어
                </label>
                <select
                  className="lol-select"
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                >
                  {tiers.map(tier => (
                    <option key={tier.value} value={tier.value}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  color: '#f0e6d2',
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '0.9rem'
                }}>
                  등급
                </label>
                <select
                  className="lol-select"
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                >
                  {divisions.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  color: '#f0e6d2',
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '0.9rem'
                }}>
                  LP
                </label>
                <input
                  type="number"
                  className="lol-input"
                  value={formData.lp}
                  min="0"
                  max="100"
                  onChange={(e) => setFormData({ ...formData, lp: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* 게임 통계 */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#c89b3c', marginBottom: '15px', fontSize: '1rem' }}>
              게임 통계
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ color: '#f0e6d2', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                  전체 승률 (%)
                </label>
                <input
                  type="number"
                  className="lol-input"
                  value={formData.winRate}
                  min="0"
                  max="100"
                  onChange={(e) => setFormData({ ...formData, winRate: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label style={{ color: '#f0e6d2', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                  최근 승률 (%)
                </label>
                <input
                  type="number"
                  className="lol-input"
                  value={formData.recentWinRate}
                  min="0"
                  max="100"
                  onChange={(e) => setFormData({ ...formData, recentWinRate: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* 포지션별 다른 통계 */}
            {formData.mainRole === 'SUPPORT' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ color: '#f0e6d2', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                    분당 시야점수
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="lol-input"
                    value={formData.visionScorePerMin}
                    min="0"
                    max="5"
                    onChange={(e) => setFormData({ ...formData, visionScorePerMin: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label style={{ color: '#f0e6d2', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                    팀기여도 (백분위)
                  </label>
                  <input
                    type="number"
                    className="lol-input"
                    value={formData.teamContribution}
                    min="0"
                    max="100"
                    onChange={(e) => setFormData({ ...formData, teamContribution: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ color: '#f0e6d2', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                    평균 KDA
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="lol-input"
                    value={formData.avgKDA}
                    min="0"
                    max="10"
                    onChange={(e) => setFormData({ ...formData, avgKDA: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label style={{ color: '#f0e6d2', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                    분당 CS
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="lol-input"
                    value={formData.csPerMin}
                    min="0"
                    max="12"
                    onChange={(e) => setFormData({ ...formData, csPerMin: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 포지션 정보 */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#c89b3c', marginBottom: '15px', fontSize: '1rem' }}>
              포지션 설정
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ color: '#f0e6d2', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                  메인 포지션
                </label>
                <select
                  className="lol-select"
                  value={formData.mainRole}
                  onChange={(e) => setFormData({ ...formData, mainRole: e.target.value })}
                >
                  {roles.map(role => (
                    <option key={role} value={role}>
                      {roleNames[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: '#f0e6d2', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                  서브 포지션
                </label>
                <select
                  className="lol-select"
                  value={formData.subRole}
                  onChange={(e) => setFormData({ ...formData, subRole: e.target.value })}
                >
                  {roles.map(role => (
                    <option key={role} value={role}>
                      {roleNames[role]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 포지션별 숙련도 슬라이더 */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#f0e6d2', display: 'block', marginBottom: '10px', fontSize: '0.9rem' }}>
                포지션별 숙련도 (1-10)
              </label>
              <div style={{
                background: 'rgba(10, 20, 40, 0.5)',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid rgba(200, 155, 60, 0.2)'
              }}>
                {roles.map(role => (
                  <div key={role} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    gap: '15px'
                  }}>
                    <div style={{
                      minWidth: '60px',
                      color: formData.mainRole === role ? '#c89b3c' : '#f0e6d2',
                      fontWeight: formData.mainRole === role ? '700' : '400'
                    }}>
                      {roleNames[role]}
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.roleProficiency[role]}
                      onChange={(e) => updateRoleProficiency(role, e.target.value)}
                      style={{
                        flex: 1,
                        accentColor: '#c89b3c'
                      }}
                    />
                    <div style={{
                      minWidth: '20px',
                      color: '#c89b3c',
                      fontWeight: '700',
                      textAlign: 'center'
                    }}>
                      {formData.roleProficiency[role]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 아이콘 선택 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              color: '#f0e6d2',
              display: 'block',
              marginBottom: '10px',
              fontSize: '0.9rem'
            }}>
              아이콘 선택
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '8px'
            }}>
              {championIcons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, championIcon: icon })}
                  style={{
                    background: formData.championIcon === icon ?
                      'linear-gradient(135deg, #c89b3c, #785a28)' :
                      'rgba(10, 20, 40, 0.6)',
                    border: formData.championIcon === icon ?
                      '2px solid #c89b3c' :
                      '1px solid rgba(200, 155, 60, 0.3)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* 버튼 영역 */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="lol-button"
              style={{
                background: 'linear-gradient(135deg, #374151, #1f2937)',
                border: '2px solid #6b7280'
              }}
            >
              취소
            </button>
            <button
              type="submit"
              className="lol-button"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlayerModal;