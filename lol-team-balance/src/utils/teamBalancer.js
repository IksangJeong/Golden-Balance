// 팀 밸런싱 알고리즘 (개선된 역할별 점수 체계 기반)

import {
  calculateRoleScore,
  extractPlayerStats,
  enrichPlayerWithRoleScores
} from './roleScoreCalculator';

import {
  BALANCE_THRESHOLDS,
  analyzeAllLanes,
  calculateTeamSynergyPenalty,
  getOverallTeamBalance
} from './laneMatchupCalculator';

/**
 * 10명의 플레이어를 2개 팀으로 나누는 함수
 * 역할별 점수 체계를 기반으로 최적의 팀 구성을 찾습니다.
 *
 * @param {Array} players - 10명의 플레이어 배열
 * @returns {Object} - 팀1, 팀2, 밸런스 정보
 */
export const balanceTeams = (players) => {
  if (players.length !== 10) {
    console.warn('정확히 10명의 플레이어가 필요합니다.');
    return null;
  }

  // 플레이어에 역할별 점수 추가
  const enrichedPlayers = players.map(p => enrichPlayerWithRoleScores(p));

  console.log('팀 밸런싱 시작:', enrichedPlayers.map(p => ({
    name: p.name,
    mainRole: p.mainRole,
    roleScores: p.roleSpecificScores
  })));

  // 스마트 조합 생성으로 최적의 팀 찾기
  const validCompositions = generateSmartCompositions(enrichedPlayers);

  if (validCompositions.length === 0) {
    console.warn('유효한 팀 구성을 생성할 수 없습니다. 폴백 알고리즘 사용.');
    return simpleFallbackBalance(enrichedPlayers);
  }

  // 모든 유효한 조합을 평가하여 최고의 조합 선택
  let bestComposition = null;
  let bestScore = Infinity;

  for (const composition of validCompositions) {
    const score = calculateCompositionScore(composition);
    if (score < bestScore) {
      bestScore = score;
      bestComposition = composition;
    }
  }

  console.log('최적 조합 발견, 밸런스 점수:', bestScore);

  // 라인별 밸런스 평가
  const laneAnalysis = analyzeAllLanes(bestComposition.team1, bestComposition.team2);
  const synergyPenalty = calculateTeamSynergyPenalty(bestComposition.team1, bestComposition.team2);
  const overallResult = getOverallTeamBalance(laneAnalysis, synergyPenalty);

  // 기존 형식과 호환되는 결과 반환
  const balance = formatLaneBalance(laneAnalysis);

  return {
    team1: bestComposition.team1,
    team2: bestComposition.team2,
    balance: balance,
    overallBalance: overallResult.grade,
    balanceScore: bestScore,
    detailedAnalysis: {
      laneAnalysis,
      synergyPenalty,
      overallResult
    }
  };
};

/**
 * 스마트 조합 생성
 * 하드 제약을 만족하는 유효한 팀 조합들을 생성합니다.
 */
function generateSmartCompositions(players) {
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const validCompositions = [];
  const maxCompositions = 100;

  // 각 역할별로 가능한 플레이어들을 그룹화
  const roleGroups = {};
  for (const role of roles) {
    roleGroups[role] = players.filter(p =>
      p.mainRole === role || p.subRole === role
    );
  }

  // 휴리스틱 조합 생성
  for (let attempt = 0; attempt < maxCompositions * 2 && validCompositions.length < maxCompositions; attempt++) {
    const composition = generateSingleComposition(players, roleGroups);

    if (composition && isValidComposition(composition)) {
      const compositionKey = getCompositionKey(composition);
      if (!validCompositions.some(c => getCompositionKey(c) === compositionKey)) {
        validCompositions.push(composition);
      }
    }
  }

  console.log(`생성된 유효한 조합 수: ${validCompositions.length}`);
  return validCompositions;
}

/**
 * 단일 조합 생성
 */
function generateSingleComposition(players, roleGroups) {
  const usedPlayers = new Set();
  const team1 = [];
  const team2 = [];
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  for (const role of roles) {
    const availablePlayers = roleGroups[role].filter(p => !usedPlayers.has(p.id));

    if (availablePlayers.length < 2) {
      return null;
    }

    // 역할 숙련도 기준으로 정렬
    availablePlayers.sort((a, b) => {
      const aProf = a.roleProficiency?.[role] || (a.mainRole === role ? 8 : 5);
      const bProf = b.roleProficiency?.[role] || (b.mainRole === role ? 8 : 5);
      return bProf - aProf;
    });

    // 상위 플레이어들 중에서 랜덤 선택
    const topCount = Math.min(4, availablePlayers.length);
    const player1 = availablePlayers[Math.floor(Math.random() * topCount)];
    usedPlayers.add(player1.id);

    const remainingPlayers = availablePlayers.filter(p => p.id !== player1.id);
    const player2 = remainingPlayers[Math.floor(Math.random() * Math.min(3, remainingPlayers.length))];
    usedPlayers.add(player2.id);

    team1.push({ ...player1, assignedRole: role });
    team2.push({ ...player2, assignedRole: role });
  }

  return { team1, team2 };
}

/**
 * 조합의 유효성 검사 (강화된 하드 제약)
 * - 역할 점수 차이: 25점 이하
 * - 숙련도 차이: 4점 이하
 * - 티어 격차: 2단계 이하
 */
function isValidComposition(composition) {
  const { team1, team2 } = composition;
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  const TIER_INDEX = {
    'IRON': 0, 'BRONZE': 1, 'SILVER': 2, 'GOLD': 3,
    'PLATINUM': 4, 'EMERALD': 5, 'DIAMOND': 6,
    'MASTER': 7, 'GRANDMASTER': 8, 'CHALLENGER': 9,
    'UNRANKED': 2
  };

  for (const role of roles) {
    const player1 = team1.find(p => p.assignedRole === role);
    const player2 = team2.find(p => p.assignedRole === role);

    if (!player1 || !player2) return false;

    // 역할별 점수 계산
    const roleScore1 = player1.roleSpecificScores?.[role] ||
      calculateRoleScore(role, extractPlayerStats(player1));
    const roleScore2 = player2.roleSpecificScores?.[role] ||
      calculateRoleScore(role, extractPlayerStats(player2));

    const roleScoreDiff = Math.abs(roleScore1 - roleScore2);

    // 역할 점수 차이 검사 (25점 이하)
    if (roleScoreDiff > BALANCE_THRESHOLDS.MAX_ROLE_SCORE_DIFF) {
      return false;
    }

    // 숙련도 차이 검사 (4점 이하)
    const prof1 = player1.roleProficiency?.[role] || (player1.mainRole === role ? 8 : 5);
    const prof2 = player2.roleProficiency?.[role] || (player2.mainRole === role ? 8 : 5);
    const profDiff = Math.abs(prof1 - prof2);

    if (profDiff > BALANCE_THRESHOLDS.MAX_PROFICIENCY_DIFF) {
      return false;
    }

    // 티어 격차 검사 (2단계 이하)
    const tier1 = (player1.tier || 'UNRANKED').toUpperCase();
    const tier2 = (player2.tier || 'UNRANKED').toUpperCase();
    const tierIndex1 = TIER_INDEX[tier1] ?? TIER_INDEX['UNRANKED'];
    const tierIndex2 = TIER_INDEX[tier2] ?? TIER_INDEX['UNRANKED'];
    const tierGap = Math.abs(tierIndex1 - tierIndex2);

    if (tierGap > BALANCE_THRESHOLDS.MAX_TIER_GAP) {
      return false;
    }
  }

  return true;
}

/**
 * 조합의 고유 키 생성
 */
function getCompositionKey(composition) {
  const { team1, team2 } = composition;
  const team1Ids = team1.map(p => p.id).sort().join(',');
  const team2Ids = team2.map(p => p.id).sort().join(',');
  return `${team1Ids}|${team2Ids}`;
}

/**
 * 조합 점수 계산 (역할별 LMS 기반)
 * 낮을수록 더 좋은 밸런스
 */
function calculateCompositionScore(composition) {
  const { team1, team2 } = composition;

  // 라인별 LMS 합산
  const laneAnalysis = analyzeAllLanes(team1, team2);
  const totalLms = laneAnalysis.totalLms;

  // 시너지 페널티
  const synergyPenalty = calculateTeamSynergyPenalty(team1, team2);

  // 포지션 적합도 페널티
  let positionFitPenalty = 0;
  for (const team of [team1, team2]) {
    for (const player of team) {
      const isMainRole = player.mainRole === player.assignedRole;
      const proficiency = player.roleProficiency?.[player.assignedRole] || (isMainRole ? 8 : 5);

      if (!isMainRole) {
        positionFitPenalty += 5;
      }
      if (proficiency < 6) {
        positionFitPenalty += (6 - proficiency) * 2;
      }
    }
  }

  // 최종 점수 (가중치 적용)
  const finalScore = (totalLms * 0.5) + (synergyPenalty * 0.3) + (positionFitPenalty * 0.2);

  return Math.round(finalScore * 100) / 100;
}

/**
 * 기존 형식과 호환되는 라인 밸런스 포맷
 */
function formatLaneBalance(laneAnalysis) {
  const balance = {};

  for (const [role, analysis] of Object.entries(laneAnalysis.lanes)) {
    balance[role] = {
      team1Player: analysis.team1Player,
      team2Player: analysis.team2Player,
      team1Skill: analysis.team1RoleScore,
      team2Skill: analysis.team2RoleScore,
      team1Prof: analysis.team1Proficiency,
      team2Prof: analysis.team2Proficiency,
      team1Fit: analysis.team1Proficiency >= 7 ? '메인' : '서브',
      team2Fit: analysis.team2Proficiency >= 7 ? '메인' : '서브',
      skillDiff: analysis.roleScoreDiff.toFixed(0),
      profDiff: analysis.profDiff,
      totalDiff: ((analysis.lms / ((analysis.team1RoleScore + analysis.team2RoleScore) / 2)) * 100).toFixed(1),
      grade: analysis.grade,
      gradeReason: analysis.gradeReason,
      lms: analysis.lms
    };
  }

  return balance;
}

/**
 * 단순 폴백 밸런싱
 */
function simpleFallbackBalance(players) {
  console.log('폴백 알고리즘 실행');

  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const team1 = [];
  const team2 = [];
  const usedPlayers = new Set();

  // 각 역할에 대해 가장 적합한 플레이어 2명씩 선택
  for (const role of roles) {
    const candidates = players
      .filter(p => !usedPlayers.has(p.id) && (p.mainRole === role || p.subRole === role))
      .sort((a, b) => {
        const scoreA = a.roleSpecificScores?.[role] || calculateRoleScore(role, extractPlayerStats(a));
        const scoreB = b.roleSpecificScores?.[role] || calculateRoleScore(role, extractPlayerStats(b));
        return scoreB - scoreA;
      });

    if (candidates.length >= 2) {
      team1.push({ ...candidates[0], assignedRole: role });
      team2.push({ ...candidates[1], assignedRole: role });
      usedPlayers.add(candidates[0].id);
      usedPlayers.add(candidates[1].id);
    } else if (candidates.length === 1) {
      const targetTeam = team1.length <= team2.length ? team1 : team2;
      targetTeam.push({ ...candidates[0], assignedRole: role });
      usedPlayers.add(candidates[0].id);

      const remaining = players.filter(p => !usedPlayers.has(p.id));
      if (remaining.length > 0) {
        const otherTeam = targetTeam === team1 ? team2 : team1;
        otherTeam.push({ ...remaining[0], assignedRole: role });
        usedPlayers.add(remaining[0].id);
      }
    }
  }

  // 역할 순서대로 정렬
  const reorderedTeam1 = reorderTeamByRoles(team1);
  const reorderedTeam2 = reorderTeamByRoles(team2);

  const laneAnalysis = analyzeAllLanes(reorderedTeam1, reorderedTeam2);
  const balance = formatLaneBalance(laneAnalysis);

  return {
    team1: reorderedTeam1,
    team2: reorderedTeam2,
    balance: balance,
    overallBalance: '맞벨',
    detailedAnalysis: {
      laneAnalysis,
      synergyPenalty: 0,
      overallResult: { grade: '맞벨', reason: '폴백 알고리즘 사용' }
    }
  };
}

/**
 * 팀 내 역할 재배치
 */
function reorderTeamByRoles(team) {
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const reordered = [];

  for (const role of roles) {
    const player = team.find(p => p.assignedRole === role);
    if (player) {
      reordered.push(player);
    }
  }

  return reordered;
}

// 호환성을 위한 기존 함수들 유지
export const evaluateLaneBalance = (composition) => {
  const laneAnalysis = analyzeAllLanes(composition.team1, composition.team2);
  return formatLaneBalance(laneAnalysis);
};

export const getOverallBalance = (laneBalance) => {
  const grades = Object.values(laneBalance).map(lb => lb.grade);
  const goldenCount = grades.filter(g => g === '황벨').length;
  const poorCount = grades.filter(g => g === '똥벨').length;

  if (poorCount >= 3) return '똥벨';
  if (poorCount >= 2) return '맞벨';
  if (goldenCount >= 4) return '황벨';
  if (goldenCount >= 3 && poorCount === 0) return '황벨';

  return '맞벨';
};
