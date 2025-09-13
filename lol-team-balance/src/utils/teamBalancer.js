// 팀 밸런싱 알고리즘 (algorithm.md 기반)

/**
 * 10명의 플레이어를 2개 팀으로 나누는 함수
 * algorithm.md에 정의된 점수 체계를 기반으로 최적의 팀 구성을 찾습니다.
 *
 * @param {Array} players - 10명의 플레이어 배열
 * @returns {Object} - 팀1, 팀2, 밸런스 정보
 */
export const balanceTeams = (players) => {
  if (players.length !== 10) {
    console.warn('정확히 10명의 플레이어가 필요합니다.');
    return null;
  }

  console.log('팀 밸런싱 시작:', players.map(p => ({
    name: p.name,
    totalScore: p.totalSkillScore || p.skillScore,
    roleScore: p.roleScore || 0,
    mainRole: p.mainRole
  })));

  // 스마트 조합 생성으로 최적의 팀 찾기
  const validCompositions = generateSmartCompositions(players);

  if (validCompositions.length === 0) {
    console.warn('유효한 팀 구성을 생성할 수 없습니다. 폴백 알고리즘 사용.');
    return simpleFallbackBalance(players);
  }

  // 모든 유효한 조합을 평가하여 최고의 조합 선택
  let bestComposition = null;
  let bestScore = Infinity;

  for (const composition of validCompositions) {
    const score = calculateAdvancedBalanceScore(composition);
    if (score < bestScore) {
      bestScore = score;
      bestComposition = composition;
    }
  }

  console.log('최적 조합 발견, 밸런스 점수:', bestScore);

  // 라인별 밸런스 평가
  const laneBalance = evaluateAdvancedLaneBalance(bestComposition);
  const overallBalance = getAdvancedOverallBalance(laneBalance);

  return {
    team1: bestComposition.team1,
    team2: bestComposition.team2,
    balance: laneBalance,
    overallBalance: overallBalance,
    balanceScore: bestScore
  };
};

/**
 * 스마트 조합 생성
 * algorithm.md의 조건을 만족하는 유효한 팀 조합들을 생성합니다.
 */
function generateSmartCompositions(players) {
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const validCompositions = [];
  const maxCompositions = 100; // 성능을 위해 최대 조합 수 제한

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
      // 중복 조합 방지
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
      return null; // 해당 역할에 충분한 플레이어가 없음
    }

    // 역할 숙련도 기준으로 정렬
    availablePlayers.sort((a, b) => {
      const aProf = a.roleProficiency?.[role] || (a.mainRole === role ? 8 : 5);
      const bProf = b.roleProficiency?.[role] || (b.mainRole === role ? 8 : 5);
      return bProf - aProf;
    });

    // 상위 플레이어들 중에서 랜덤 선택 (너무 예측 가능하지 않도록)
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
 * 조합의 유효성 검사 (algorithm.md 기준)
 */
function isValidComposition(composition) {
  const { team1, team2 } = composition;
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  for (const role of roles) {
    const player1 = team1.find(p => p.assignedRole === role);
    const player2 = team2.find(p => p.assignedRole === role);

    if (!player1 || !player2) return false;

    // 종합 실력 점수 차이 검사 (30점 이하)
    const skillScore1 = player1.totalSkillScore || player1.skillScore || 50;
    const skillScore2 = player2.totalSkillScore || player2.skillScore || 50;
    const skillDiff = Math.abs(skillScore1 - skillScore2);

    if (skillDiff > 30) {
      return false;
    }

    // 라인 숙련도 차이 검사 (5점 이하)
    const prof1 = player1.roleProficiency?.[role] || (player1.mainRole === role ? 8 : 5);
    const prof2 = player2.roleProficiency?.[role] || (player2.mainRole === role ? 8 : 5);
    const profDiff = Math.abs(prof1 - prof2);

    if (profDiff > 5) {
      return false;
    }
  }

  return true;
}

/**
 * 조합의 고유 키 생성 (중복 방지용)
 */
function getCompositionKey(composition) {
  const { team1, team2 } = composition;
  const team1Ids = team1.map(p => p.id).sort().join(',');
  const team2Ids = team2.map(p => p.id).sort().join(',');
  return `${team1Ids}|${team2Ids}`;
}

/**
 * 고급 밸런스 점수 계산 (algorithm.md 기반)
 * 다중 기준을 사용하여 팀 밸런스를 평가합니다.
 */
function calculateAdvancedBalanceScore(composition) {
  const { team1, team2 } = composition;
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  // 1. 팀 총점 차이 (가중치 30%)
  const team1Total = team1.reduce((sum, p) => {
    const skillScore = p.totalSkillScore || p.skillScore || 50;
    const roleScore = p.roleScore || 0;
    return sum + skillScore + roleScore;
  }, 0);

  const team2Total = team2.reduce((sum, p) => {
    const skillScore = p.totalSkillScore || p.skillScore || 50;
    const roleScore = p.roleScore || 0;
    return sum + skillScore + roleScore;
  }, 0);

  const totalDiff = Math.abs(team1Total - team2Total);

  // 2. 라인별 매치업 차이 (가중치 40%)
  let laneMatchupScore = 0;
  for (const role of roles) {
    const player1 = team1.find(p => p.assignedRole === role);
    const player2 = team2.find(p => p.assignedRole === role);

    if (player1 && player2) {
      const skill1 = player1.totalSkillScore || player1.skillScore || 50;
      const skill2 = player2.totalSkillScore || player2.skillScore || 50;
      const prof1 = player1.roleProficiency?.[role] || (player1.mainRole === role ? 8 : 5);
      const prof2 = player2.roleProficiency?.[role] || (player2.mainRole === role ? 8 : 5);

      // 종합 실력 차이 + 숙련도 차이
      const skillDiff = Math.abs(skill1 - skill2);
      const profDiff = Math.abs(prof1 - prof2);

      laneMatchupScore += skillDiff + (profDiff * 5); // 숙련도 차이에 가중치
    }
  }

  // 3. 포지션 적합도 (가중치 20%)
  let positionFitScore = 0;
  for (const team of [team1, team2]) {
    for (const player of team) {
      const isMainRole = player.mainRole === player.assignedRole;
      const proficiency = player.roleProficiency?.[player.assignedRole] || (isMainRole ? 8 : 5);

      // 메인 포지션이 아니거나 숙련도가 낮으면 페널티
      if (!isMainRole) {
        positionFitScore += 10;
      }
      if (proficiency < 6) {
        positionFitScore += (6 - proficiency) * 2;
      }
    }
  }

  // 4. 팀 시너지 (가중치 10%)
  let synergyScore = 0;
  for (const team of [team1, team2]) {
    // 동일한 메인 포지션을 가진 플레이어가 다른 포지션에 배치된 경우 시너지 감소
    const mainRoles = team.map(p => p.mainRole);
    const assignedRoles = team.map(p => p.assignedRole);
    const roleConflicts = mainRoles.filter((role, index) => role !== assignedRoles[index]).length;
    synergyScore += roleConflicts * 5;
  }

  // 최종 점수 계산 (낮을수록 좋음)
  const finalScore = (totalDiff * 0.3) + (laneMatchupScore * 0.4) + (positionFitScore * 0.2) + (synergyScore * 0.1);

  return Math.round(finalScore * 100) / 100;
}

/**
 * 고급 라인별 밸런스 평가 (algorithm.md 기반)
 */
function evaluateAdvancedLaneBalance(composition) {
  const { team1, team2 } = composition;
  const laneBalance = {};
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  for (const role of roles) {
    const player1 = team1.find(p => p.assignedRole === role);
    const player2 = team2.find(p => p.assignedRole === role);

    if (player1 && player2) {
      // 종합 실력 점수 계산
      const skill1 = player1.totalSkillScore || player1.skillScore || 50;
      const skill2 = player2.totalSkillScore || player2.skillScore || 50;

      // 라인 숙련도 계산
      const prof1 = player1.roleProficiency?.[role] || (player1.mainRole === role ? 8 : 5);
      const prof2 = player2.roleProficiency?.[role] || (player2.mainRole === role ? 8 : 5);

      // 종합 점수 (실력 + 숙련도)
      const total1 = skill1 + (prof1 * 5); // 숙련도에 가중치
      const total2 = skill2 + (prof2 * 5);

      const skillDiff = Math.abs(skill1 - skill2);
      const profDiff = Math.abs(prof1 - prof2);
      const totalDiff = Math.abs(total1 - total2);
      const avgTotal = (total1 + total2) / 2;
      const diffPercentage = (totalDiff / avgTotal) * 100;

      // algorithm.md 기준 밸런스 등급 판정
      let grade;
      let gradeReason = '';

      // 점수 차이 30점 초과 또는 숙련도 차이 5점 초과 시 똥벨
      if (skillDiff > 30 || profDiff > 5) {
        grade = '똥벨';
        gradeReason = `점수차${skillDiff.toFixed(0)}점, 숙련도차${profDiff}점`;
      } else if (diffPercentage < 8) {
        grade = '황벨'; // 황금 밸런스
        gradeReason = '완벽한 밸런스';
      } else if (diffPercentage < 20) {
        grade = '맞벨'; // 적절한 밸런스
        gradeReason = '양호한 밸런스';
      } else {
        grade = '똥벨'; // 나쁜 밸런스
        gradeReason = '큰 실력차';
      }

      // 포지션 적합도 표시
      const fit1 = player1.mainRole === role ? '메인' : '서브';
      const fit2 = player2.mainRole === role ? '메인' : '서브';

      laneBalance[role] = {
        team1Player: player1.name,
        team2Player: player2.name,
        team1Skill: skill1,
        team2Skill: skill2,
        team1Prof: prof1,
        team2Prof: prof2,
        team1Fit: fit1,
        team2Fit: fit2,
        skillDiff: skillDiff.toFixed(0),
        profDiff: profDiff,
        totalDiff: diffPercentage.toFixed(1),
        grade,
        gradeReason
      };
    }
  }

  return laneBalance;
}

/**
 * 고급 전체 밸런스 평가
 */
function getAdvancedOverallBalance(laneBalance) {
  const grades = Object.values(laneBalance).map(lb => lb.grade);
  const goldenCount = grades.filter(g => g === '황벨').length;
  const poorCount = grades.filter(g => g === '똥벨').length;

  // algorithm.md 기준 더 엄격한 평가
  if (poorCount >= 3) return '똥벨'; // 3개 이상 라인이 똥벨이면 전체 똥벨
  if (poorCount >= 2) return '맞벨'; // 2개 라인이 똥벨이면 전체 맞벨 (기존 똥벨에서 완화)
  if (goldenCount >= 4) return '황벨'; // 4개 이상 라인이 황벨이면 전체 황벨
  if (goldenCount >= 3 && poorCount === 0) return '황벨'; // 3개 황벨 + 똥벨 없음

  return '맞벨';
}

/**
 * 단순 폴백 밸런싱 (새로운 점수 체계 기반)
 */
function simpleFallbackBalance(players) {
  console.log('폴백 알고리즘 실행');

  // 종합 점수로 정렬 (종합 실력 + 라인 숙련도)
  const sorted = [...players].sort((a, b) => {
    const scoreA = (a.totalSkillScore || a.skillScore || 50) + (a.roleScore || 0);
    const scoreB = (b.totalSkillScore || b.skillScore || 50) + (b.roleScore || 0);
    return scoreB - scoreA;
  });

  // 역할별로 플레이어 분배
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const team1 = [];
  const team2 = [];

  // 각 역할에 대해 가장 적합한 플레이어 2명씩 선택
  const usedPlayers = new Set();

  for (const role of roles) {
    const candidates = sorted.filter(p =>
      !usedPlayers.has(p.id) && (p.mainRole === role || p.subRole === role)
    );

    if (candidates.length >= 2) {
      // 가장 좋은 2명 선택
      const player1 = candidates[0];
      const player2 = candidates[1];

      team1.push({ ...player1, assignedRole: role });
      team2.push({ ...player2, assignedRole: role });

      usedPlayers.add(player1.id);
      usedPlayers.add(player2.id);
    } else if (candidates.length === 1) {
      // 1명만 있으면 랜덤 배치
      const player = candidates[0];
      const targetTeam = team1.length <= team2.length ? team1 : team2;
      targetTeam.push({ ...player, assignedRole: role });
      usedPlayers.add(player.id);

      // 나머지 플레이어 중에서 선택
      const remaining = sorted.filter(p => !usedPlayers.has(p.id));
      if (remaining.length > 0) {
        const otherTeam = targetTeam === team1 ? team2 : team1;
        otherTeam.push({ ...remaining[0], assignedRole: role });
        usedPlayers.add(remaining[0].id);
      }
    }
  }

  // 팀 내에서 역할 재배치
  const reorderedTeam1 = reorderTeamByRoles(team1);
  const reorderedTeam2 = reorderTeamByRoles(team2);

  return {
    team1: reorderedTeam1,
    team2: reorderedTeam2,
    balance: evaluateAdvancedLaneBalance({ team1: reorderedTeam1, team2: reorderedTeam2 }),
    overallBalance: '맞벨'
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
export const evaluateLaneBalance = evaluateAdvancedLaneBalance;
export const getOverallBalance = getAdvancedOverallBalance;