// 학생회 롤 플레이어 데이터베이스

// === 점수 계산 유틸리티 함수 ===

// 티어 점수 계산 (60점 만점) - algorithm.md 기준
export const calculateTierScore = (tier, division = 'I', lp = 0) => {
  // algorithm.md 1-1 랭크 티어 (60점)
  const tierScores = {
    IRON: 10,      // 아이언~브론즈: 10점
    BRONZE: 10,    // 아이언~브론즈: 10점
    SILVER: 20,    // 실버: 20점
    GOLD: 30,      // 골드: 30점
    PLATINUM: 40,  // 플래티넘: 40점
    EMERALD: 50,   // 에메랄드: 50점
    DIAMOND: 60,   // 다이아몬드 이상: 60점
    MASTER: 60,    // 다이아몬드 이상: 60점
    GRANDMASTER: 60, // 다이아몬드 이상: 60점
    CHALLENGER: 60   // 다이아몬드 이상: 60점
  };

  const baseScore = tierScores[tier] || 10;

  // 디비전과 LP는 algorithm.md에 명시되지 않았으므로 제거
  console.log(`[Tier Score] ${tier}: ${baseScore}점`);
  return baseScore;
};

// 승률 점수 계산 (20점 만점) - algorithm.md 기준
export const calculateWinRateScore = (winRate) => {
  // algorithm.md 1-2 승률 (20점): 최근 랭크 게임 20게임 기준
  let score;
  if (winRate < 40) score = 5;        // 40% 미만: 5점
  else if (winRate < 50) score = 10;  // 40% ~ 50%: 10점
  else if (winRate < 60) score = 15;  // 50% ~ 60%: 15점
  else score = 20;                    // 60% 이상: 20점

  console.log(`[Win Rate Score] ${winRate}%: ${score}점`);
  return score;
};

// KDA 점수 계산 (10점 만점) - algorithm.md 기준
export const calculateKDAScore = (kda) => {
  // algorithm.md 1-3 KDA (10점): 최근 20게임 기준
  let score;
  if (kda < 2.5) score = 2;      // KDA 2.5 미만: 2점
  else if (kda < 4.0) score = 5; // KDA 2.5 ~ 4.0: 5점
  else score = 10;                // KDA 4.0 이상: 10점

  console.log(`[KDA Score] ${kda}: ${score}점`);
  return score;
};

// 분당 CS 점수 계산 (10점 만점) - algorithm.md 기준
export const calculateCSScore = (csPerMin) => {
  // algorithm.md 1-4 분당 CS (10점): 최근 20게임 기준
  let score;
  if (csPerMin < 5.0) score = 2;      // 5.0 미만: 2점
  else if (csPerMin < 7.0) score = 5; // 5.0 ~ 7.0: 5점
  else score = 10;                     // 7.0 이상: 10점

  console.log(`[CS Score] ${csPerMin}/min: ${score}점`);
  return score;
};

// 서포터용 시야 점수 계산 (20점 만점) - algorithm.md 기준
export const calculateVisionScore = (visionScorePerMin) => {
  // algorithm.md 1-3 분당 시야 점수(20점): 최근 20게임 기준 (서포터용)
  let score;
  if (visionScorePerMin < 1.5) score = 5;        // 1.5 미만: 5점
  else if (visionScorePerMin < 2.0) score = 10;  // 1.5 ~ 2.0: 10점
  else if (visionScorePerMin < 2.5) score = 15;  // 2.0 ~ 2.5: 15점
  else score = 20;                                // 2.5 이상: 20점

  console.log(`[Vision Score] ${visionScorePerMin}/min: ${score}점`);
  return score;
};

// 서포터용 팀 기여도 점수 계산 (10점 만점) - algorithm.md 기준
export const calculateTeamContributionScore = (teamContribution) => {
  // algorithm.md 1-4 팀기여도(10점): 평균 CC시간, 치유량, 방어막 등
  // teamContribution은 백분위로 받음 (0-100)
  let score;
  if (teamContribution < 25) score = 2;      // 하위 25%: 2점
  else if (teamContribution < 75) score = 5; // 25% ~ 75%: 5점
  else score = 10;                            // 상위 75%: 10점

  console.log(`[Team Contribution] ${teamContribution}%: ${score}점`);
  return score;
};

// 성장세 점수 계산 - algorithm.md에는 없지만 보조 지표로 사용
export const calculateTrendScore = (recentWinRate, overallWinRate) => {
  // 이 점수는 algorithm.md에 없으므로 사용하지 않음
  return 0;
};

// 종합 실력 점수 계산 (100점 만점) - algorithm.md 기준
export const calculateTotalSkillScore = (player) => {
  console.log(`\n=== 종합 실력 점수 계산: ${player.name} (${player.mainRole}) ===`);

  // 1-1. 랭크 티어 (60점)
  const tierScore = calculateTierScore(player.tier, player.division, player.lp);

  // 1-2. 승률 (20점) - 최근 20게임 승률 우선, 없으면 전체 승률 사용
  const winRate = player.recentWinRate || player.winRate;
  const winRateScore = calculateWinRateScore(winRate);

  let kdaOrVisionScore = 0;
  let csOrContributionScore = 0;

  if (player.mainRole === 'SUPPORT') {
    // 서포터의 경우
    console.log('\n[서포터 점수 계산]');
    // 1-3. 분당 시야 점수 (20점)
    kdaOrVisionScore = calculateVisionScore(player.visionScorePerMin || 1.5);
    // 1-4. 팀기여도 (10점)
    csOrContributionScore = calculateTeamContributionScore(player.teamContribution || 50);
  } else {
    // 다른 포지션의 경우
    console.log('\n[일반 포지션 점수 계산]');
    // 1-3. KDA (10점)
    kdaOrVisionScore = calculateKDAScore(player.avgKDA || 2.0);
    // 1-4. 분당 CS (10점)
    csOrContributionScore = calculateCSScore(player.csPerMin || 5.0);
  }

  const total = tierScore + winRateScore + kdaOrVisionScore + csOrContributionScore;
  console.log(`\n[종합 실력 점수] ${total}점/100점`);
  console.log(`  - 티어: ${tierScore}점/60점`);
  console.log(`  - 승률: ${winRateScore}점/20점`);
  console.log(`  - ${player.mainRole === 'SUPPORT' ? '시야' : 'KDA'}: ${kdaOrVisionScore}점/${player.mainRole === 'SUPPORT' ? '20' : '10'}점`);
  console.log(`  - ${player.mainRole === 'SUPPORT' ? '팀기여도' : 'CS'}: ${csOrContributionScore}점/10점`);
  console.log('======================================\n');

  return Math.round(total);
};

// 라인 숙련도 점수 계산 (50점 만점) - algorithm.md 기준
export const calculateRoleScore = (player) => {
  // algorithm.md 2. 라인 숙련도 점수 (총 50점)
  // 각 라인에 대해 10점 만점으로 평가
  // 플레이어는 1지망 라인을 선택, 해당 라인의 숙련도 점수가 가장 높아야 함

  console.log(`\n=== 라인 숙련도 점수 계산: ${player.name} ===`);
  console.log('라인별 숙련도:', player.roleProficiency);

  // 모든 라인의 숙련도 점수 합계 (각 라인 10점 만점)
  let totalRoleScore = 0;
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  for (const role of roles) {
    const proficiency = player.roleProficiency?.[role] || 0;
    totalRoleScore += proficiency;
    console.log(`  - ${role}: ${proficiency}점/10점`);
  }

  // 최대 50점으로 제한
  const finalScore = Math.min(50, totalRoleScore);
  console.log(`[라인 숙련도 총점] ${finalScore}점/50점\n`);

  return finalScore;
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
    avgDamage: basicInfo.avgDamage || 15000, // 평균 딜량
    avgAssists: basicInfo.avgAssists || 6, // 평균 어시스트
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

    // 역할별 점수 (황금밸런스 알고리즘용)
    roleSpecificScores: basicInfo.roleSpecificScores || null,

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
    },

    // 메인 역할에 대한 역할별 점수
    get mainRoleScore() {
      if (this.roleSpecificScores && this.mainRole) {
        return this.roleSpecificScores[this.mainRole] || 0;
      }
      return 0;
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