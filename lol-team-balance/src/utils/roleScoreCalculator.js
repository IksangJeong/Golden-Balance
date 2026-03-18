// 역할별 점수 계산기 (Role-Specific Score Calculator)
// 각 역할(TOP, JUNGLE, MID, ADC, SUPPORT)에 특화된 점수를 계산합니다.

/**
 * 티어 승수표
 * 각 티어별 기본 점수 승수
 */
const TIER_MULTIPLIERS = {
  'IRON': 0.17,
  'BRONZE': 0.25,
  'SILVER': 0.33,
  'GOLD': 0.50,
  'PLATINUM': 0.67,
  'EMERALD': 0.83,
  'DIAMOND': 1.00,
  'MASTER': 1.00,
  'GRANDMASTER': 1.00,
  'CHALLENGER': 1.00,
  'UNRANKED': 0.25  // 언랭크는 브론즈 수준으로
};

/**
 * 값을 특정 범위로 제한
 * @param {number} value - 입력 값
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number} - 제한된 값
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * 티어 승수 가져오기
 * @param {string} tier - 티어 문자열
 * @returns {number} - 승수 (0.17 ~ 1.00)
 */
export const getTierMultiplier = (tier) => {
  const upperTier = (tier || 'UNRANKED').toUpperCase();
  return TIER_MULTIPLIERS[upperTier] || TIER_MULTIPLIERS['UNRANKED'];
};

/**
 * TOP 라인 점수 계산 (100점 만점)
 * - 티어: 40점
 * - CS/분: 20점
 * - KDA: 15점
 * - 피해량: 15점
 * - 승률: 10점
 *
 * @param {Object} stats - 플레이어 통계
 * @returns {number} - TOP 역할 점수 (0~100)
 */
export const calculateTopScore = (stats) => {
  const {
    tier = 'UNRANKED',
    csPerMin = 5.0,
    avgKDA = 2.0,
    avgDamage = 15000,
    winRate = 50
  } = stats;

  const tierScore = getTierMultiplier(tier) * 40;
  const csScore = clamp((csPerMin - 4.0) / 5.0 * 20, 0, 20);
  const kdaScore = clamp((avgKDA - 1.0) / 4.0 * 15, 0, 15);
  const damageScore = clamp((avgDamage - 10000) / 20000 * 15, 0, 15);
  const winRateScore = clamp((winRate - 35) / 25 * 10, 0, 10);

  return Math.round(tierScore + csScore + kdaScore + damageScore + winRateScore);
};

/**
 * JUNGLE 점수 계산 (100점 만점)
 * - 티어: 40점
 * - KDA: 25점
 * - 시야/분: 15점
 * - 승률: 20점
 *
 * @param {Object} stats - 플레이어 통계
 * @returns {number} - JUNGLE 역할 점수 (0~100)
 */
export const calculateJungleScore = (stats) => {
  const {
    tier = 'UNRANKED',
    avgKDA = 2.5,
    visionScorePerMin = 1.0,
    winRate = 50
  } = stats;

  const tierScore = getTierMultiplier(tier) * 40;
  const kdaScore = clamp((avgKDA - 1.5) / 4.0 * 25, 0, 25);
  const visionScore = clamp((visionScorePerMin - 0.5) / 1.5 * 15, 0, 15);
  const winRateScore = clamp((winRate - 35) / 25 * 20, 0, 20);

  return Math.round(tierScore + kdaScore + visionScore + winRateScore);
};

/**
 * MID 라인 점수 계산 (100점 만점)
 * - 티어: 40점
 * - 피해량: 25점
 * - CS/분: 15점
 * - KDA: 15점
 * - 승률: 5점
 *
 * @param {Object} stats - 플레이어 통계
 * @returns {number} - MID 역할 점수 (0~100)
 */
export const calculateMidScore = (stats) => {
  const {
    tier = 'UNRANKED',
    avgDamage = 15000,
    csPerMin = 5.5,
    avgKDA = 2.5,
    winRate = 50
  } = stats;

  const tierScore = getTierMultiplier(tier) * 40;
  const damageScore = clamp((avgDamage - 12000) / 20000 * 25, 0, 25);
  const csScore = clamp((csPerMin - 4.5) / 4.5 * 15, 0, 15);
  const kdaScore = clamp((avgKDA - 1.5) / 4.5 * 15, 0, 15);
  const winRateScore = clamp((winRate - 40) / 20 * 5, 0, 5);

  return Math.round(tierScore + damageScore + csScore + kdaScore + winRateScore);
};

/**
 * ADC 점수 계산 (100점 만점)
 * - 티어: 30점
 * - 피해량: 25점
 * - CS/분: 20점
 * - KDA: 15점
 * - 승률: 10점
 *
 * @param {Object} stats - 플레이어 통계
 * @returns {number} - ADC 역할 점수 (0~100)
 */
export const calculateAdcScore = (stats) => {
  const {
    tier = 'UNRANKED',
    avgDamage = 15000,
    csPerMin = 6.0,
    avgKDA = 2.5,
    winRate = 50
  } = stats;

  const tierScore = getTierMultiplier(tier) * 30;
  const damageScore = clamp((avgDamage - 12000) / 18000 * 25, 0, 25);
  const csScore = clamp((csPerMin - 5.0) / 4.0 * 20, 0, 20);
  const kdaScore = clamp((avgKDA - 1.5) / 5.0 * 15, 0, 15);
  const winRateScore = clamp((winRate - 35) / 25 * 10, 0, 10);

  return Math.round(tierScore + damageScore + csScore + kdaScore + winRateScore);
};

/**
 * SUPPORT 점수 계산 (100점 만점)
 * - 티어: 35점
 * - 시야/분: 30점
 * - 어시스트: 20점
 * - 승률: 15점
 *
 * @param {Object} stats - 플레이어 통계
 * @returns {number} - SUPPORT 역할 점수 (0~100)
 */
export const calculateSupportScore = (stats) => {
  const {
    tier = 'UNRANKED',
    visionScorePerMin = 1.5,
    avgAssists = 8,
    winRate = 50
  } = stats;

  const tierScore = getTierMultiplier(tier) * 35;
  const visionScore = clamp((visionScorePerMin - 0.8) / 2.0 * 30, 0, 30);
  const assistScore = clamp((avgAssists - 5) / 10 * 20, 0, 20);
  const winRateScore = clamp((winRate - 35) / 25 * 15, 0, 15);

  return Math.round(tierScore + visionScore + assistScore + winRateScore);
};

/**
 * 특정 역할에 대한 점수 계산
 * @param {string} role - 역할 (TOP, JUNGLE, MID, ADC, SUPPORT)
 * @param {Object} stats - 플레이어 통계
 * @returns {number} - 해당 역할 점수 (0~100)
 */
export const calculateRoleScore = (role, stats) => {
  const upperRole = (role || '').toUpperCase();

  switch (upperRole) {
    case 'TOP':
      return calculateTopScore(stats);
    case 'JUNGLE':
      return calculateJungleScore(stats);
    case 'MID':
      return calculateMidScore(stats);
    case 'ADC':
    case 'BOTTOM':
      return calculateAdcScore(stats);
    case 'SUPPORT':
    case 'UTILITY':
      return calculateSupportScore(stats);
    default:
      // 역할이 불명확한 경우 평균적인 점수 반환
      return Math.round(
        (calculateTopScore(stats) +
         calculateJungleScore(stats) +
         calculateMidScore(stats) +
         calculateAdcScore(stats) +
         calculateSupportScore(stats)) / 5
      );
  }
};

/**
 * 플레이어의 모든 역할 점수 계산
 * @param {Object} stats - 플레이어 통계
 * @returns {Object} - 각 역할별 점수 객체
 */
export const calculateAllRoleScores = (stats) => {
  return {
    TOP: calculateTopScore(stats),
    JUNGLE: calculateJungleScore(stats),
    MID: calculateMidScore(stats),
    ADC: calculateAdcScore(stats),
    SUPPORT: calculateSupportScore(stats)
  };
};

/**
 * 플레이어 데이터에서 통계 추출
 * API 응답이나 수동 입력 데이터에서 역할 점수 계산에 필요한 통계를 추출합니다.
 *
 * @param {Object} player - 플레이어 객체
 * @returns {Object} - 정규화된 통계 객체
 */
export const extractPlayerStats = (player) => {
  // 티어 추출
  const tier = player.tier || player.soloRank?.tier || 'UNRANKED';

  // 승률 추출
  const winRate = player.winRate ||
    player.recentStats?.winRate ||
    (player.soloRank ?
      (player.soloRank.wins / (player.soloRank.wins + player.soloRank.losses) * 100) : 50);

  // KDA 추출
  const avgKDA = player.avgKDA || player.recentStats?.avgKDA || 2.0;

  // CS/분 추출
  const csPerMin = player.csPerMin || player.recentStats?.avgCSPerMin || 5.0;

  // 피해량 추출
  const avgDamage = player.avgDamage || player.recentStats?.avgDamage || 15000;

  // 시야 점수/분 추출
  const visionScorePerMin = player.visionScorePerMin ||
    player.recentStats?.avgVisionScorePerMin || 1.0;

  // 평균 어시스트 추출
  const avgAssists = player.avgAssists || player.recentStats?.avgAssists || 6;

  return {
    tier,
    winRate,
    avgKDA,
    csPerMin,
    avgDamage,
    visionScorePerMin,
    avgAssists
  };
};

/**
 * 플레이어 객체에 역할별 점수 추가
 * @param {Object} player - ���레이어 객체
 * @returns {Object} - 역할별 점수가 추가된 플레이어 객체
 */
export const enrichPlayerWithRoleScores = (player) => {
  const stats = extractPlayerStats(player);
  const roleScores = calculateAllRoleScores(stats);

  return {
    ...player,
    roleSpecificScores: roleScores,
    // 메인 역할 점수도 계산
    mainRoleScore: player.mainRole ? roleScores[player.mainRole.toUpperCase()] : null
  };
};

const roleScoreCalculator = {
  getTierMultiplier,
  calculateTopScore,
  calculateJungleScore,
  calculateMidScore,
  calculateAdcScore,
  calculateSupportScore,
  calculateRoleScore,
  calculateAllRoleScores,
  extractPlayerStats,
  enrichPlayerWithRoleScores,
  TIER_MULTIPLIERS
};

export default roleScoreCalculator;
