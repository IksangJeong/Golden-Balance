import React, { useState } from 'react';
import { roleNames, createPlayerProfile } from '../../data/players';
import { RiotAPI } from '../../services/riotAPI';

const AddPlayerModal = ({ onClose, onAdd }) => {
  // 모달 탭 상태
  const [activeTab, setActiveTab] = useState('api'); // 'api' or 'manual'

  // API 검색 상태
  const [apiSearch, setApiSearch] = useState({
    summonerName: '',
    isLoading: false,
    error: null,
    result: null
  });

  // 상세 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    summonerName: '',
    tier: 'GOLD',
    division: 'I',
    lp: 0,
    winRate: 50,
    recentWinRate: 50,
    avgKDA: 2.0,
    csPerMin: 5.5,
    visionScorePerMin: 1.2,
    teamContribution: 50,
    mainRole: 'TOP',
    subRole: 'MID',
    roleProficiency: {
      TOP: 5,
      JUNGLE: 5,
      MID: 5,
      ADC: 5,
      SUPPORT: 5
    },
    championIcon: '🎮'
  });

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

  // API 검색 함수
  const handleAPISearch = async () => {
    if (!apiSearch.summonerName.trim()) {
      alert('소환사명을 입력해주세요.');
      return;
    }

    console.log('\n======================================');
    console.log('=== Riot API 검색 시작 ===');
    console.log(`검색 소환사명: ${apiSearch.summonerName}`);
    console.log('======================================\n');

    setApiSearch(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await RiotAPI.searchSummoner(apiSearch.summonerName);

      if (result.success) {
        console.log('\n=== API 검색 성공 ===');
        console.log('원본 데이터:', result.data);

        const profile = RiotAPI.convertToPlayerProfile(result.data, apiSearch.summonerName);

        console.log('\n=== 변환된 프로필 ===');
        console.log(`이름: ${profile.name}`);
        console.log(`티어: ${profile.tier} ${profile.division} (${profile.lp} LP)`);
        console.log(`승률: 전체 ${profile.winRate}%, 최근 ${profile.recentWinRate}%`);
        console.log(`KDA: ${profile.avgKDA.toFixed(1)}`);
        console.log(`분당 CS: ${profile.csPerMin.toFixed(1)}`);
        console.log(`분당 시야점수: ${profile.visionScorePerMin.toFixed(1)}`);
        console.log(`팀 기여도: ${profile.teamContribution}%`);
        console.log(`메인 포지션: ${profile.mainRole}`);
        console.log(`서브 포지션: ${profile.subRole || '없음'}`);
        console.log(`포지션 숙련도:`, profile.roleProficiency);
        console.log('\n=== 점수 계산 결과 ===');
        console.log(`종합 실력 점수: ${profile.totalSkillScore}/100`);
        console.log(`라인 숙련도 점수: ${profile.roleScore}/50`);
        console.log(`총점: ${profile.overallScore}/150`);
        console.log('======================================\n');

        // 폼 데이터에 API 결과 적용 (소수점 첫째자리까지 표시)
        setFormData({
          ...formData,
          name: profile.name,
          summonerName: profile.summonerName,
          tier: profile.tier,
          division: profile.division,
          lp: profile.lp,
          winRate: Math.round(profile.winRate),
          recentWinRate: Math.round(profile.recentWinRate),
          avgKDA: parseFloat(profile.avgKDA.toFixed(1)),
          csPerMin: parseFloat(profile.csPerMin.toFixed(1)),
          visionScorePerMin: parseFloat(profile.visionScorePerMin.toFixed(1)),
          teamContribution: Math.round(profile.teamContribution),
          mainRole: profile.mainRole,
          subRole: profile.subRole,
          roleProficiency: profile.roleProficiency
        });

        setApiSearch(prev => ({
          ...prev,
          isLoading: false,
          result: result.data,
          error: null
        }));

        // 자동으로 수동 편집 탭으로 이동
        setActiveTab('manual');
      } else {
        console.error('\n=== API 검색 실패 ===');
        console.error('오류:', result.error);
        console.error('======================================\n');

        setApiSearch(prev => ({
          ...prev,
          isLoading: false,
          error: result.error
        }));
      }
    } catch (error) {
      console.error('\n=== API 검색 예외 발생 ===');
      console.error('예외:', error);
      console.error('======================================\n');

      setApiSearch(prev => ({
        ...prev,
        isLoading: false,
        error: '검색 중 오류가 발생했습니다.'
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    // createPlayerProfile을 사용하여 완전한 프로필 생성
    const profile = createPlayerProfile(formData);

    console.log('\n=== 플레이어 추가 완료 ===');
    console.log(`플레이어: ${profile.name}`);
    console.log(`티어: ${profile.tier} ${profile.division}`);
    console.log(`종합 실력 점수: ${profile.totalSkillScore}/100`);
    console.log(`라인 숙련도 점수: ${profile.roleScore}/50`);
    console.log(`총점: ${profile.overallScore}/150`);
    console.log('======================================\n');

    onAdd(profile);
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
          플레이어 추가
        </h2>

        {/* 탭 버튼 */}
        <div style={{
          display: 'flex',
          marginBottom: '20px',
          borderBottom: '2px solid rgba(200, 155, 60, 0.3)'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            style={{
              flex: 1,
              padding: '10px',
              background: activeTab === 'api' ?
                'linear-gradient(135deg, #c89b3c, #785a28)' :
                'transparent',
              border: 'none',
              color: activeTab === 'api' ? '#0a1428' : '#f0e6d2',
              fontWeight: '700',
              cursor: 'pointer',
              borderBottom: activeTab === 'api' ? '2px solid #c89b3c' : '2px solid transparent'
            }}
          >
            🔍 자동 검색
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            style={{
              flex: 1,
              padding: '10px',
              background: activeTab === 'manual' ?
                'linear-gradient(135deg, #c89b3c, #785a28)' :
                'transparent',
              border: 'none',
              color: activeTab === 'manual' ? '#0a1428' : '#f0e6d2',
              fontWeight: '700',
              cursor: 'pointer',
              borderBottom: activeTab === 'manual' ? '2px solid #c89b3c' : '2px solid transparent'
            }}
          >
            ⚙️ 수동 입력
          </button>
        </div>

        {/* API 검색 탭 */}
        {activeTab === 'api' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              background: 'rgba(10, 20, 40, 0.7)',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid rgba(200, 155, 60, 0.3)',
              marginBottom: '15px'
            }}>
              <h3 style={{
                color: '#c89b3c',
                marginBottom: '15px',
                fontSize: '1.1rem'
              }}>
                소환사 검색
              </h3>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input
                  type="text"
                  className="lol-input"
                  value={apiSearch.summonerName}
                  onChange={(e) => setApiSearch({ ...apiSearch, summonerName: e.target.value })}
                  placeholder="Riot ID를 입력하세요 (예: Player#KR1)"
                  onKeyPress={(e) => e.key === 'Enter' && handleAPISearch()}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAPISearch}
                  disabled={apiSearch.isLoading}
                  className="lol-button"
                  style={{
                    minWidth: '100px',
                    background: apiSearch.isLoading ?
                      'linear-gradient(135deg, #374151, #1f2937)' :
                      'linear-gradient(135deg, #c89b3c, #785a28)'
                  }}
                >
                  {apiSearch.isLoading ? '🔄 검색중...' : '🔍 검색'}
                </button>
              </div>

              {apiSearch.error && (
                <div style={{
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  ❌ {apiSearch.error}
                </div>
              )}

              {apiSearch.result && (
                <div style={{
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  ✅ 데이터를 성공적으로 불러왔습니다! '수동 입력' 탭에서 확인하고 수정할 수 있습니다.
                </div>
              )}

              <div style={{
                fontSize: '0.8rem',
                color: '#9ca3af',
                marginTop: '10px',
                lineHeight: '1.4'
              }}>
                💡 Riot ID로 검색하면 자동으로 티어, 승률, KDA, CS 등의 정보를 가져옵니다.
                <br />
                📝 Riot ID는 "게임명#태그" 형식입니다 (예: Hide on bush#KR1, Faker#KR1)
                <br />
                🎮 현재 개발 모드에서는 시뮬레이션 데이터를 생성합니다.
              </div>
            </div>
          </div>
        )}

        {/* 수동 입력 탭 */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSubmit}>
            {/* 기본 정보 */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#c89b3c', marginBottom: '15px', fontSize: '1.1rem' }}>
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
              <h3 style={{ color: '#c89b3c', marginBottom: '15px', fontSize: '1.1rem' }}>
                게임 통계 (최근 20게임)
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
              <h3 style={{ color: '#c89b3c', marginBottom: '15px', fontSize: '1.1rem' }}>
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
                추가
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddPlayerModal;