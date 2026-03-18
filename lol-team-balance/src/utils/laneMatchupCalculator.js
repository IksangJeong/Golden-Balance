// 라인 매칭 점수 계산기 (Lane Matchup Score Calculator)
// 각 라인의 매칭 점수(LMS)를 계산하고 밸런스 등급을 판정합니다.

import { calculateRoleScore, extractPlayerStats } from './roleScoreCalculator';

/**
 * 밸런스 등급 상수
 */
export const BALANCE_GRADES = {
  GOLDEN: '황벨',    // 황금밸런스 - 완벽한 균형
  FAIR: '맞벨',      // 맞벨런스 - 적절한 균형
  POOR: '똥벨'       // 똥밸런스 - 불균형
};

/**
 * 밸런스 임계값 상수
 */
export const BALANCE_THRESHOLDS = {
  GOLDEN_LMS: 10,      // 황벨 기준: LMS < 10
  FAIR_LMS: 20,        // 맞벨 기준: LMS < 20

  // 하드 제약 조건 (강화됨)
  MAX_ROLE_SCORE_DIFF: 25,    // 역할 점수 최대 차이
  MAX_PROFICIENCY_DIFF: 4,    // 숙련도 최대 차이
  MAX_TIER_GAP: 2,            // 티어 최대 격차

  // 전체 팀 밸런스 기준
  GOLDEN_TOTAL: 50,    // 황금밸런스 총점
  FAIR_TOTAL: 80,      // 맞벨런스 총점
  POOR_TOTAL: 100      // 똥벨런스 총점
};

/**
 * 티어 인덱스 (차이 계산용)
 */
const TIER_INDEX = {
  'IRON': 0,
  'BRONZE': 1,
  'SILVER': 2,
  'GOLD': 3,
  'PLATINUM': 4,
  'EMERALD': 5,
  'DIAMOND': 6,
  'MASTER': 7,
  'GRANDMASTER': 8,
  'CHALLENGER': 9,
  'UNRANKED': 2  // 언랭크는 실버 수준으로
};

/**
 * 티어 인덱스 가져오기
 * @param {string} tier - 티어 문자열
 * @returns {number} - 티어 인덱스
 */
const getTierIndex = (tier) => {
  const upperTier = (tier || 'UNRANKED').toUpperCase();
  return TIER_INDEX[upperTier] ?? TIER_INDEX['UNRANKED'];
};

/**
 * 두 플레이어 간의 티어 격차 계산
 * @param {string} tier1 - 플레이어1 티어
 * @param {string} tier2 - 플레이어2 티어
 * @returns {number} - 티어 격차 (양수)
 */
export const calculateTierGap = (tier1, tier2) => {
  return Math.abs(getTierIndex(tier1) - getTierIndex(tier2));
};

/**
 * 숙련도 계수 계산
 * 숙련도 차이가 클수록 페널티 적용
 *
 * @param {number} prof1 - 플레이어1 숙련도 (1~10)
 * @param {number} prof2 - 플레이어2 숙련도 (1~10)
 * @returns {number} - 숙련도 계수 (1.0 ~ 1.5)
 */
export const calculateProficiencyFactor = (prof1, prof2) => {
  const profDiff = Math.abs(prof1 - prof2);
  // 숙련도 차이 * 0.05, 최대 0.5 추가
  return 1.0 + Math.min(profDiff * 0.05, 0.5);
};

/**
 * 라인 매칭 점수(LMS) 계산
 *
 * LMS = |역할점수_A - 역할점수_B| × 숙련도계수
 *
 * @param {Object} player1 - 팀1 플레이어
 * @param {Object} player2 - 팀2 플레이어
 * @param {string} role - 배정된 역할
 * @returns {Object} - LMS 및 상세 정보
 */
export const calculateLaneMatchupScore = (player1, player2, role) => {
  // 플레이어 통계 추출
  const stats1 = extractPlayerStats(player1);
  const stats2 = extractPlayerStats(player2);

  // 역할별 점수 계산
  const roleScore1 = player1.roleSpecificScores?.[role] || calculateRoleScore(role, stats1);
  const roleScore2 = player2.roleSpecificScores?.[role] || calculateRoleScore(role, stats2);

  // 숙련도 추출
  const prof1 = player1.roleProficiency?.[role] ||
    (player1.mainRole === role ? 8 : (player1.subRole === role ? 6 : 4));
  const prof2 = player2.roleProficiency?.[role] ||
    (player2.mainRole === role ? 8 : (player2.subRole === role ? 6 : 4));

  // 티어 추출
  const tier1 = player1.tier || player1.soloRank?.tier || 'UNRANKED';
  const tier2 = player2.tier || player2.soloRank?.tier || 'UNRANKED';

  // 차이 계산
  const roleScoreDiff = Math.abs(roleScore1 - roleScore2);
  const profDiff = Math.abs(prof1 - prof2);
  const tierGap = calculateTierGap(tier1, tier2);

  // 숙련도 계수
  const proficiencyFactor = calculateProficiencyFactor(prof1, prof2);

  // LMS 계산
  const lms = roleScoreDiff * proficiencyFactor;

  // 하드 제약 위반 체크
  const violations = [];
  if (roleScoreDiff > BALANCE_THRESHOLDS.MAX_ROLE_SCORE_DIFF) {
    violations.push(`역할점수 차이 ${roleScoreDiff.toFixed(0)}점 > ${BALANCE_THRESHOLDS.MAX_ROLE_SCORE_DIFF}점`);
  }
  if (profDiff > BALANCE_THRESHOLDS.MAX_PROFICIENCY_DIFF) {
    violations.push(`숙련도 차이 ${profDiff}점 > ${BALANCE_THRESHOLDS.MAX_PROFICIENCY_DIFF}점`);
  }
  if (tierGap > BALANCE_THRESHOLDS.MAX_TIER_GAP) {
    violations.push(`티어 격차 ${tierGap}단계 > ${BALANCE_THRESHOLDS.MAX_TIER_GAP}단계`);
  }

  const hasViolations = violations.length > 0;

  return {
    lms: Math.round(lms * 100) / 100,
    roleScore1,
    roleScore2,
    roleScoreDiff,
    prof1,
    prof2,
    profDiff,
    tier1,
    tier2,
    tierGap,
    proficiencyFactor,
    hasViolations,
    violations
  };
};

/**
 * LMS에 따른 밸런스 등급 판정
 *
 * @param {number} lms - 라인 매칭 점수
 * @param {boolean} hasViolations - 하드 제약 위반 여부
 * @returns {string} - 밸런스 등급 ('황벨', '맞벨', '똥벨')
 */
export const getLaneBalanceGrade = (lms, hasViolations = false) => {
  if (hasViolations) {
    return BALANCE_GRADES.POOR;
  }

  if (lms < BALANCE_THRESHOLDS.GOLDEN_LMS) {
    return BALANCE_GRADES.GOLDEN;
  } else if (lms < BALANCE_THRESHOLDS.FAIR_LMS) {
    return BALANCE_GRADES.FAIR;
  } else {
    return BALANCE_GRADES.POOR;
  }
};

/**
 * 밸런스 등급에 따른 이모지 가져오기
 * @param {string} grade - 밸런스 등급
 * @returns {string} - 이모지
 */
export const getGradeEmoji = (grade) => {
  switch (grade) {
    case BALANCE_GRADES.GOLDEN:
      return '🏆';
    case BALANCE_GRADES.FAIR:
      return '⚖️';
    case BALANCE_GRADES.POOR:
      return '💩';
    default:
      return '❓';
  }
};

/**
 * 라인 매칭 상세 분석
 * 두 플레이어의 라인 매칭에 대한 상세 분석 결과를 반환합니다.
 *
 * @param {Object} player1 - 팀1 플레이어
 * @param {Object} player2 - 팀2 플레이어
 * @param {string} role - 배정된 역할
 * @returns {Object} - 상세 라인 분석 결과
 */
export const analyzeLaneMatchup = (player1, player2, role) => {
  const matchup = calculateLaneMatchupScore(player1, player2, role);
  const grade = getLaneBalanceGrade(matchup.lms, matchup.hasViolations);

  // 유리한 팀 판정
  let advantage = 'neutral';
  if (matchup.roleScore1 > matchup.roleScore2 + 5) {
    advantage = 'team1';
  } else if (matchup.roleScore2 > matchup.roleScore1 + 5) {
    advantage = 'team2';
  }

  // 등급 사유
  let gradeReason;
  if (matchup.hasViolations) {
    gradeReason = matchup.violations.join(', ');
  } else if (grade === BALANCE_GRADES.GOLDEN) {
    gradeReason = '완벽한 밸런스';
  } else if (grade === BALANCE_GRADES.FAIR) {
    gradeReason = '양호한 밸런스';
  } else {
    gradeReason = `LMS ${matchup.lms.toFixed(1)} (역할점수 차이: ${matchup.roleScoreDiff.toFixed(0)}점)`;
  }

  return {
    role,
    team1Player: player1.name,
    team2Player: player2.name,
    team1RoleScore: matchup.roleScore1,
    team2RoleScore: matchup.roleScore2,
    team1Proficiency: matchup.prof1,
    team2Proficiency: matchup.prof2,
    team1Tier: matchup.tier1,
    team2Tier: matchup.tier2,
    lms: matchup.lms,
    grade,
    gradeEmoji: getGradeEmoji(grade),
    gradeReason,
    advantage,
    roleScoreDiff: matchup.roleScoreDiff,
    profDiff: matchup.profDiff,
    tierGap: matchup.tierGap,
    hasViolations: matchup.hasViolations,
    violations: matchup.violations
  };
};

/**
 * 팀 전체의 라인별 밸런스 분석
 *
 * @param {Array} team1 - 팀1 플레이어 배열 (assignedRole 포함)
 * @param {Array} team2 - 팀2 플레이어 배열 (assignedRole 포함)
 * @returns {Object} - 전체 라인 분석 결과
 */
export const analyzeAllLanes = (team1, team2) => {
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const laneAnalysis = {};
  let totalLms = 0;
  let goldenCount = 0;
  let poorCount = 0;
  let hasAnyViolation = false;

  for (const role of roles) {
    const player1 = team1.find(p => p.assignedRole === role);
    const player2 = team2.find(p => p.assignedRole === role);

    if (player1 && player2) {
      const analysis = analyzeLaneMatchup(player1, player2, role);
      laneAnalysis[role] = analysis;
      totalLms += analysis.lms;

      if (analysis.grade === BALANCE_GRADES.GOLDEN) goldenCount++;
      if (analysis.grade === BALANCE_GRADES.POOR) poorCount++;
      if (analysis.hasViolations) hasAnyViolation = true;
    }
  }

  return {
    lanes: laneAnalysis,
    totalLms,
    goldenCount,
    poorCount,
    hasViolations: hasAnyViolation
  };
};

/**
 * 팀 시너지 페널티 계산
 *
 * @param {Array} team1 - 팀1 플레이어 배열
 * @param {Array} team2 - 팀2 플레이어 배열
 * @returns {number} - 시너지 페널티 점수
 */
export const calculateTeamSynergyPenalty = (team1, team2) => {
  // 평균 티어 차이
  const avgTier1 = team1.reduce((sum, p) => sum + getTierIndex(p.tier || 'UNRANKED'), 0) / team1.length;
  const avgTier2 = team2.reduce((sum, p) => sum + getTierIndex(p.tier || 'UNRANKED'), 0) / team2.length;
  const tierPenalty = Math.abs(avgTier1 - avgTier2) * 5;

  // 총 역할 점수 차이
  const getTeamTotalRoleScore = (team) => {
    return team.reduce((sum, p) => {
      const role = p.assignedRole;
      const stats = extractPlayerStats(p);
      const roleScore = p.roleSpecificScores?.[role] || calculateRoleScore(role, stats);
      return sum + roleScore;
    }, 0);
  };

  const totalScore1 = getTeamTotalRoleScore(team1);
  const totalScore2 = getTeamTotalRoleScore(team2);
  const scorePenalty = Math.abs(totalScore1 - totalScore2) * 0.1;

  return tierPenalty + scorePenalty;
};

/**
 * 전체 팀 밸런스 등급 판정
 *
 * @param {Object} laneAnalysis - analyzeAllLanes의 결과
 * @param {number} synergyPenalty - 시너지 페널티
 * @returns {Object} - 전체 밸런스 결과
 */
export const getOverallTeamBalance = (laneAnalysis, synergyPenalty = 0) => {
  const { totalLms, goldenCount, poorCount, hasViolations } = laneAnalysis;
  const totalBalance = totalLms + synergyPenalty;

  let grade;
  let reason;

  // 하드 제약 위반 시 무조건 똥벨
  if (hasViolations) {
    grade = BALANCE_GRADES.POOR;
    reason = '하드 제약 위반';
  }
  // 똥벨 판정 조건
  else if (poorCount >= 2 || totalBalance > BALANCE_THRESHOLDS.POOR_TOTAL) {
    grade = BALANCE_GRADES.POOR;
    reason = poorCount >= 2 ? `${poorCount}개 라인 불균형` : `총점 ${totalBalance.toFixed(1)} 초과`;
  }
  // 황금밸런스 판정 조건
  else if (goldenCount >= 5 && totalBalance < BALANCE_THRESHOLDS.GOLDEN_TOTAL) {
    grade = BALANCE_GRADES.GOLDEN;
    reason = '모든 라인 완벽 밸런스';
  }
  else if (goldenCount >= 4 && poorCount === 0 && totalBalance < BALANCE_THRESHOLDS.GOLDEN_TOTAL) {
    grade = BALANCE_GRADES.GOLDEN;
    reason = `${goldenCount}개 라인 황금밸런스`;
  }
  // 맞벨 판정
  else if (goldenCount >= 3 && poorCount === 0 && totalBalance < BALANCE_THRESHOLDS.FAIR_TOTAL) {
    grade = BALANCE_GRADES.FAIR;
    reason = '양호한 밸런스';
  }
  else {
    grade = BALANCE_GRADES.FAIR;
    reason = '적절한 밸런스';
  }

  return {
    grade,
    gradeEmoji: getGradeEmoji(grade),
    reason,
    totalBalance: Math.round(totalBalance * 100) / 100,
    synergyPenalty: Math.round(synergyPenalty * 100) / 100,
    goldenCount,
    poorCount,
    hasViolations
  };
};

const laneMatchupCalculator = {
  BALANCE_GRADES,
  BALANCE_THRESHOLDS,
  calculateTierGap,
  calculateProficiencyFactor,
  calculateLaneMatchupScore,
  getLaneBalanceGrade,
  getGradeEmoji,
  analyzeLaneMatchup,
  analyzeAllLanes,
  calculateTeamSynergyPenalty,
  getOverallTeamBalance
};

export default laneMatchupCalculator;
