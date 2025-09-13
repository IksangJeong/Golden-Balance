// 학생회 롤 플레이어 데이터베이스

// === 점수 계산 유틸리티 함수 ===

// 티어 점수 계산 (50점 만점)
export const calculateTierScore = (tier, division = 'I', lp = 0) => {
  const tierScores = {
    IRON: 5,
    BRONZE: 5,
    SILVER: 15,
    GOLD: 25,
    PLATINUM: 35,
    EMERALD: 40,
    DIAMOND: 45,
    MASTER: 50,
    GRANDMASTER: 50,
    CHALLENGER: 50
  };

  const divisionBonus = {
    'IV': 0, 'III': 1, 'II': 2, 'I': 3
  };

  const baseScore = tierScores[tier] || 5;
  const bonus = tier === 'MASTER' || tier === 'GRANDMASTER' || tier === 'CHALLENGER' ? 0 : (divisionBonus[division] || 0);
  const lpBonus = Math.min(2, lp / 50); // LP에 따른 소수점 보너스

  return Math.min(50, baseScore + bonus + lpBonus);
};

// 승률 점수 계산 (15점 만점)
export const calculateWinRateScore = (winRate) => {
  if (winRate < 40) return 3;
  if (winRate < 50) return 7;
  if (winRate < 60) return 11;
  return 15;
};

// KDA 점수 계산 (15점 만점)
export const calculateKDAScore = (kda) => {
  if (kda < 1.5) return 3;
  if (kda < 2.5) return 7;
  if (kda < 4.0) return 11;
  return 15;
};

// 분당 CS 점수 계산 (10점 만점)
export const calculateCSScore = (csPerMin) => {
  if (csPerMin < 4.0) return 2;
  if (csPerMin < 6.0) return 5;
  if (csPerMin < 7.5) return 8;
  return 10;
};

// 서포터용 시야 점수 계산 (15점 만점)
export const calculateVisionScore = (visionScorePerMin) => {
  if (visionScorePerMin < 1.0) return 3;
  if (visionScorePerMin < 1.5) return 7;
  if (visionScorePerMin < 2.0) return 11;
  return 15;
};

// 성장세 점수 계산 (10점 만점)
export const calculateTrendScore = (recentWinRate, overallWinRate) => {
  const diff = recentWinRate - overallWinRate;
  if (diff < -10) return 2;
  if (diff < -5) return 4;
  if (diff < 5) return 6;
  if (diff < 10) return 8;
  return 10;
};

// 종합 실력 점수 계산 (100점 만점)
export const calculateTotalSkillScore = (player) => {
  const tierScore = calculateTierScore(player.tier, player.division, player.lp);
  const winRateScore = calculateWinRateScore(player.winRate);
  const trendScore = calculateTrendScore(player.recentWinRate || player.winRate, player.winRate);

  let performanceScore = 0;
  let csScore = 0;

  if (player.mainRole === 'SUPPORT') {
    performanceScore = calculateVisionScore(player.visionScorePerMin);
    csScore = Math.min(10, (player.teamContribution || 50) / 10); // 팀기여도를 10점 만점으로
  } else {
    performanceScore = calculateKDAScore(player.avgKDA);
    csScore = calculateCSScore(player.csPerMin);
  }

  return Math.round(tierScore + winRateScore + performanceScore + csScore + trendScore);
};

// 라인 숙련도 점수 계산 (50점 만점)
export const calculateRoleScore = (player) => {
  const mainRoleScore = (player.roleProficiency?.[player.mainRole] || 5) * 3; // 30점 만점
  const subRoleScore = (player.roleProficiency?.[player.subRole] || 3) * 2;   // 20점 만점
  return Math.min(50, mainRoleScore + subRoleScore);
};

// === 데이터 구조 ===

// 확장된 플레이어 데이터 구조 예시
export const createPlayerProfile = (basicInfo) => {
  const profile = {
    // 기본 정보
    id: basicInfo.id || `p${Date.now()}`,
    name: basicInfo.name,
    summonerName: basicInfo.summonerName || basicInfo.name,
    puuid: basicInfo.puuid || null, // Riot API 식별자

    // 랭크 정보
    tier: basicInfo.tier || 'UNRANKED',
    division: basicInfo.division || 'I',
    lp: basicInfo.lp || 0,

    // 게임 통계 (최근 20게임 기준)
    winRate: basicInfo.winRate || 50, // 전체 승률
    recentWinRate: basicInfo.recentWinRate || basicInfo.winRate || 50, // 최근 20게임 승률
    avgKDA: basicInfo.avgKDA || 2.0,
    csPerMin: basicInfo.csPerMin || 5.5,
    visionScorePerMin: basicInfo.visionScorePerMin || 1.2, // 서포터용
    teamContribution: basicInfo.teamContribution || 50, // 팀기여도 (서포터용, 백분위)

    // 포지션 정보
    mainRole: basicInfo.mainRole || 'MID',
    subRole: basicInfo.subRole || null,
    roleProficiency: basicInfo.roleProficiency || {
      TOP: 5,
      JUNGLE: 5,
      MID: 5,
      ADC: 5,
      SUPPORT: 5
    },

    // UI 정보
    championIcon: basicInfo.championIcon || roleIcons[basicInfo.mainRole] || '🗡️',

    // 메타데이터
    lastUpdated: basicInfo.lastUpdated || new Date().toISOString().split('T')[0],
    isFromAPI: basicInfo.isFromAPI || false,

    // 계산된 점수들 (자동 계산)
    get totalSkillScore() {
      return calculateTotalSkillScore(this);
    },
    get roleScore() {
      return calculateRoleScore(this);
    },
    get overallScore() {
      return this.totalSkillScore + this.roleScore;
    },

    // 호환성을 위한 기존 필드
    get skillScore() {
      return this.totalSkillScore;
    },
    get tierLevel() {
      const tierLevels = {
        IRON: 1, BRONZE: 2, SILVER: 3, GOLD: 4, PLATINUM: 5,
        EMERALD: 6, DIAMOND: 7, MASTER: 8, GRANDMASTER: 9, CHALLENGER: 10
      };
      return tierLevels[this.tier] || 3;
    }
  };

  return profile;
};
// 하드코딩된 플레이어 데이터 제거됨 - 사용자가 직접 추가하도록 변경


// 티어별 색상
export const tierColors = {
  CHALLENGER: 'bg-gradient-to-r from-cyan-400 to-blue-500',
  GRANDMASTER: 'bg-gradient-to-r from-red-500 to-red-700',
  MASTER: 'bg-gradient-to-r from-purple-500 to-purple-700',
  DIAMOND: 'bg-gradient-to-r from-blue-400 to-blue-600',
  EMERALD: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
  PLATINUM: 'bg-gradient-to-r from-teal-400 to-cyan-500',
  GOLD: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
  SILVER: 'bg-gradient-to-r from-gray-300 to-gray-500',
  BRONZE: 'bg-gradient-to-r from-orange-600 to-orange-800',
  IRON: 'bg-gradient-to-r from-gray-600 to-gray-800',
  UNRANKED: 'bg-gradient-to-r from-gray-400 to-gray-600'
};

// 라인별 아이콘
export const roleIcons = {
  TOP: '🗡️',
  JUNGLE: '🌲',
  MID: '🔮',
  ADC: '🏹',
  SUPPORT: '🛡️'
};

// 라인 이름 한글화
export const roleNames = {
  TOP: '탑',
  JUNGLE: '정글',
  MID: '미드',
  ADC: '원딜',
  SUPPORT: '서폿'
};

// 티어 점수 맵핑 (UI 표시용)
export const tierScoreMap = {
  IRON: { min: 5, max: 8, color: '#817876' },
  BRONZE: { min: 5, max: 8, color: '#8D5524' },
  SILVER: { min: 15, max: 18, color: '#9CA3AF' },
  GOLD: { min: 25, max: 28, color: '#F59E0B' },
  PLATINUM: { min: 35, max: 38, color: '#06B6D4' },
  EMERALD: { min: 40, max: 43, color: '#059669' },
  DIAMOND: { min: 45, max: 48, color: '#3B82F6' },
  MASTER: { min: 50, max: 50, color: '#7C3AED' },
  GRANDMASTER: { min: 50, max: 50, color: '#DC2626' },
  CHALLENGER: { min: 50, max: 50, color: '#0EA5E9' }
};

// 점수별 등급 표시
export const getScoreGrade = (score, maxScore) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return { grade: 'S+', color: '#FFD700' };
  if (percentage >= 80) return { grade: 'S', color: '#FFA500' };
  if (percentage >= 70) return { grade: 'A', color: '#32CD32' };
  if (percentage >= 60) return { grade: 'B', color: '#1E90FF' };
  if (percentage >= 50) return { grade: 'C', color: '#9370DB' };
  return { grade: 'D', color: '#DC143C' };
};