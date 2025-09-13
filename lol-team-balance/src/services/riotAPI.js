// Riot Games API 서비스 레이어
// 프론트엔드에서 직접 API 호출 시 CORS 문제가 있으므로
// 개발 단계에서는 목업 데이터 사용, 추후 백엔드 프록시 서버 연동

import { createPlayerProfile } from '../data/players';

// API 설정
const RIOT_API_CONFIG = {
  // 백엔드 프록시 서버 URL
  BASE_URL: process.env.REACT_APP_API_PROXY || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api'),
  USE_MOCK: false, // 실제 API 사용
  CACHE_DURATION: 1000 * 60 * 60 * 24 // 24시간 캐시
};

// 캐시 스토리지
class APICache {
  constructor() {
    this.cache = new Map();
  }

  set(key, data, duration = RIOT_API_CONFIG.CACHE_DURATION) {
    const expiry = Date.now() + duration;
    this.cache.set(key, { data, expiry });

    // localStorage에도 저장 (페이지 새로고침 시 유지)
    try {
      localStorage.setItem(`riot_cache_${key}`, JSON.stringify({ data, expiry }));
    } catch (error) {
      console.warn('캐시를 localStorage에 저장할 수 없습니다:', error);
    }
  }

  get(key) {
    // 메모리 캐시 확인
    let cached = this.cache.get(key);

    // 메모리에 없으면 localStorage 확인
    if (!cached) {
      try {
        const stored = localStorage.getItem(`riot_cache_${key}`);
        if (stored) {
          cached = JSON.parse(stored);
          this.cache.set(key, cached);
        }
      } catch (error) {
        console.warn('localStorage에서 캐시를 불러올 수 없습니다:', error);
      }
    }

    if (cached) {
      if (Date.now() < cached.expiry) {
        return cached.data;
      } else {
        // 만료된 캐시 삭제
        this.cache.delete(key);
        try {
          localStorage.removeItem(`riot_cache_${key}`);
        } catch (error) {
          // 무시
        }
      }
    }

    return null;
  }

  clear() {
    this.cache.clear();
    // localStorage의 캐시도 모두 삭제
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('riot_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('localStorage 캐시를 삭제할 수 없습니다:', error);
    }
  }
}

const apiCache = new APICache();

// 목업 데이터 생성기 (Riot ID 지원)
const generateMockData = (riotId, gameName, tagLine) => {
  const tiers = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND'];
  const divisions = ['IV', 'III', 'II', 'I'];
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  const randomTier = tiers[Math.floor(Math.random() * tiers.length)];
  const randomDivision = divisions[Math.floor(Math.random() * divisions.length)];
  const randomRole = roles[Math.floor(Math.random() * roles.length)];
  const randomSubRole = roles.filter(r => r !== randomRole)[Math.floor(Math.random() * 4)];

  // gameName 기반으로 시드 생성 (일관된 데이터를 위해)
  const seed = gameName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seededRandom = (min, max) => {
    const x = Math.sin(seed * Math.random()) * 10000;
    return min + Math.floor((x - Math.floor(x)) * (max - min + 1));
  };

  return {
    // Account API 데이터
    puuid: `mock_puuid_${gameName}_${tagLine}`,
    gameName: gameName,
    tagLine: tagLine,
    riotId: riotId,

    // Summoner API 데이터
    id: `mock_summoner_${gameName}`,
    accountId: `mock_account_${gameName}`,
    name: gameName, // 기존 호환성
    profileIconId: seededRandom(1, 50),
    revisionDate: Date.now(),
    summonerLevel: seededRandom(30, 200),

    // 랭크 정보 (League API)
    tier: randomTier,
    rank: randomDivision,
    leaguePoints: seededRandom(0, 100),
    wins: seededRandom(50, 150),
    losses: seededRandom(30, 120),

    // 최근 경기 통계 (Match API 시뮬레이션)
    recentMatches: {
      wins: seededRandom(8, 16),
      total: 20,
      avgKDA: (seededRandom(10, 50) / 10),
      avgCS: (seededRandom(40, 80) / 10),
      avgVisionScore: (seededRandom(8, 25) / 10),
      avgDamage: seededRandom(15000, 35000),
      avgGold: seededRandom(10000, 18000)
    },

    // 포지션 정보 (플레이 빈도 기반)
    positions: {
      [randomRole]: seededRandom(60, 80),
      [randomSubRole]: seededRandom(15, 35),
    },

    // 챔피언 숙련도
    championMastery: Array.from({ length: 5 }, (_, i) => ({
      championId: seededRandom(1, 160),
      championLevel: seededRandom(4, 7),
      championPoints: seededRandom(20000, 100000)
    })),

    // 랭크 정보 배열 (새로운 API 형식)
    rankedInfo: [{
      queueType: 'RANKED_SOLO_5x5',
      tier: randomTier,
      rank: randomDivision,
      leaguePoints: seededRandom(0, 100),
      wins: seededRandom(50, 150),
      losses: seededRandom(30, 120)
    }]
  };
};

// Riot ID 유틸리티 함수들
const parseRiotId = (riotId) => {
  if (!riotId || typeof riotId !== 'string') {
    return { gameName: '', tagLine: '' };
  }

  const trimmed = riotId.trim();
  const hashIndex = trimmed.lastIndexOf('#');

  if (hashIndex === -1) {
    // #이 없으면 경고하고 기본 태그 사용
    return {
      gameName: trimmed,
      tagLine: 'KR1',
      warning: 'Riot ID 형식이 아닙니다. "닉네임#태그" 형식으로 입력해주세요.'
    };
  }

  const gameName = trimmed.substring(0, hashIndex);
  const tagLine = trimmed.substring(hashIndex + 1);

  if (!gameName || !tagLine) {
    return {
      gameName: trimmed,
      tagLine: 'KR1',
      warning: 'Riot ID 형식이 올바르지 않습니다.'
    };
  }

  return { gameName, tagLine };
};

const validateRiotId = (riotId) => {
  const { gameName, tagLine, warning } = parseRiotId(riotId);

  if (warning) {
    return { valid: false, error: warning };
  }

  if (gameName.length < 3 || gameName.length > 16) {
    return { valid: false, error: '게임명은 3-16자 사이여야 합니다.' };
  }

  if (tagLine.length < 3 || tagLine.length > 5) {
    return { valid: false, error: '태그는 3-5자 사이여야 합니다.' };
  }

  // 특수문자 검사 (기본적인 검사만)
  if (!/^[a-zA-Z0-9가-힣 ]+$/.test(gameName)) {
    return { valid: false, error: '게임명에 허용되지 않는 문자가 포함되어 있습니다.' };
  }

  if (!/^[a-zA-Z0-9]+$/.test(tagLine)) {
    return { valid: false, error: '태그는 영문자와 숫자만 사용할 수 있습니다.' };
  }

  return { valid: true, gameName, tagLine };
};

// API 함수들
export const RiotAPI = {
  /**
   * Riot ID로 플레이어 정보 검색
   * @param {string} riotId - Riot ID (gameName#tagLine)
   * @param {string} region - 지역 (kr, na1, euw1 등)
   * @returns {Promise<Object>} - 플레이어 정보
   */
  async searchSummoner(riotId, region = 'kr') {
    // Riot ID 유효성 검사
    const validation = validateRiotId(riotId);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const { gameName, tagLine } = validation;
    const cacheKey = `riot_account_${region}_${gameName.toLowerCase()}_${tagLine.toLowerCase()}`;

    // 캐시 확인
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    try {
      let data;

      if (RIOT_API_CONFIG.USE_MOCK) {
        // 목업 데이터 사용
        await new Promise(resolve => setTimeout(resolve, 500)); // API 호출 시뮬레이션
        data = generateMockData(riotId, gameName, tagLine);
      } else {
        // 실제 API 호출 (통합 API 엔드포인트 사용)
        const playerResponse = await fetch(
          `${RIOT_API_CONFIG.BASE_URL}/riot/player?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`
        );

        if (!playerResponse.ok) {
          const errorData = await playerResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `플레이어 정보를 불러올 수 없습니다: ${playerResponse.status}`);
        }

        const playerData = await playerResponse.json();
        if (!playerData.success) {
          throw new Error(playerData.error || '플레이어 정보 조회에 실패했습니다.');
        }

        // 통합 API 응답을 기존 형식에 맞게 변환
        data = {
          ...playerData.data,
          // 기존 코드 호환성을 위한 필드 매핑
          rankedInfo: playerData.data.allRanks || [],
          // 최근 경기 통계를 recentMatches 형식으로 변환 (개선된 매핑)
          recentMatches: playerData.data.recentStats ? {
            wins: playerData.data.recentStats.wins,
            total: playerData.data.recentStats.gamesPlayed,
            avgKDA: playerData.data.recentStats.avgKDA,
            avgKills: playerData.data.recentStats.avgKills,
            avgDeaths: playerData.data.recentStats.avgDeaths,
            avgAssists: playerData.data.recentStats.avgAssists,
            avgCS: playerData.data.recentStats.avgCSPerMin || playerData.data.recentStats.avgCS,
            avgVisionScore: playerData.data.recentStats.avgVisionScorePerMin || playerData.data.recentStats.avgVisionScore,
            avgDamage: playerData.data.recentStats.avgDamage,
            avgGold: playerData.data.recentStats.avgGold,
            winRate: playerData.data.recentStats.winRate,
            // 서포터 전용 통계 추가
            avgCCTime: playerData.data.recentStats.avgCCTime,
            avgHealing: playerData.data.recentStats.avgHealing,
            avgShielding: playerData.data.recentStats.avgShielding,
            avgKillParticipation: playerData.data.recentStats.avgKillParticipation
          } : null,
          // 포지션 정보
          positions: playerData.data.recentStats?.positions || {},
          // 챔피언 마스터리 정보
          championMastery: playerData.data.championMastery || null
        };

        // 디버그 로그
        console.log('\n=== Riot API 데이터 수신 완료 ===');
        console.log(`플레이어: ${data.riotId}`);
        console.log(`티어: ${data.soloRank?.tier || 'UNRANKED'} ${data.soloRank?.rank || ''}`);
        console.log(`최근 승률: ${data.recentMatches?.winRate || 0}%`);
        console.log(`KDA: ${data.recentMatches?.avgKDA || 0}`);
        console.log(`분당 CS: ${data.recentMatches?.avgCS || 0}`);
        console.log(`분당 시야점수: ${data.recentMatches?.avgVisionScore || 0}`);
        console.log('포지션 통계:', data.positions);
      }

      // 캐시에 저장
      apiCache.set(cacheKey, data);

      return { success: true, data };
    } catch (error) {
      console.error('Riot ID 검색 실패:', error);
      return {
        success: false,
        error: error.message || 'Riot ID 검색 중 오류가 발생했습니다.'
      };
    }
  },

  /**
   * Riot API 데이터를 플레이어 프로필로 변환
   * @param {Object} apiData - API에서 받은 데이터 (Account + Summoner + Ranked)
   * @param {string} playerName - 표시할 플레이어 이름
   * @returns {Object} - 플레이어 프로필 객체
   */
  convertToPlayerProfile(apiData, playerName) {
    const data = apiData;

    console.log('\n=== 프로필 변환 시작 ===');
    console.log('🔍 원본 API 데이터 구조 검사:');
    console.log('  - soloRank:', data.soloRank ? 'EXISTS' : 'NULL');
    console.log('  - flexRank:', data.flexRank ? 'EXISTS' : 'NULL');
    console.log('  - allRanks:', data.allRanks ? `ARRAY[${data.allRanks.length}]` : 'NULL');
    console.log('  - isUnranked:', data.isUnranked ? 'TRUE' : 'FALSE');
    console.log('  - recentStats:', data.recentStats ? 'EXISTS' : 'NULL');

    if (data.soloRank) {
      console.log('✅ 솔로랭크 데이터:', {
        tier: data.soloRank.tier,
        rank: data.soloRank.rank,
        lp: data.soloRank.leaguePoints,
        wins: data.soloRank.wins,
        losses: data.soloRank.losses
      });
    }

    if (data.allRanks && data.allRanks.length > 0) {
      console.log('📊 전체 랭크 데이터:', data.allRanks.map(rank => ({
        queueType: rank.queueType,
        tier: rank.tier,
        rank: rank.rank
      })));
    }

    // 랭크 정보 추출 (솔로 랭크 우선, 자유랭크 fallback) - 강화된 로직
    console.log('\n=== 티어 정보 추출 프로세스 ===');

    // 1단계: 솔로랭크 확인 (player.js에서 오는 데이터 구조에 맞게 수정)
    const soloRank = data.soloRank || data.allRanks?.find(rank => rank.queueType === 'RANKED_SOLO_5x5');
    console.log('1단계 - 솔로랭크 검사:', soloRank ? 'FOUND' : 'NOT_FOUND');

    // 2단계: 자유랭크 fallback
    const flexRank = data.flexRank || data.allRanks?.find(rank => rank.queueType === 'RANKED_FLEX_SR');
    console.log('2단계 - 자유랭크 검사:', flexRank ? 'FOUND' : 'NOT_FOUND');

    // 3단계: 기타 랭크 정보
    const anyRank = data.allRanks?.[0];
    console.log('3단계 - 기타 랭크 검사:', anyRank ? 'FOUND' : 'NOT_FOUND');

    // 4단계: 최종 랭크 결정 (우선순위: 솔로 > 자유 > 기타)
    const finalRank = soloRank || flexRank || anyRank;
    console.log('4단계 - 최종 랭크 결정:', finalRank ? 'SUCCESS' : 'FAILED');

    if (finalRank) {
      console.log('선택된 랭크 타입:', finalRank.queueType || '알 수 없음');
      console.log('랭크 상세 정보:', {
        tier: finalRank.tier,
        rank: finalRank.rank,
        lp: finalRank.leaguePoints,
        wins: finalRank.wins,
        losses: finalRank.losses
      });
    }

    // 티어 정보 추출 (개선된 fallback 체계)
    const tier = finalRank?.tier || data.tier || 'UNRANKED';
    const division = finalRank?.rank || data.rank || 'I';
    const lp = finalRank?.leaguePoints || data.leaguePoints || 0;
    const wins = finalRank?.wins || data.wins || 0;
    const losses = finalRank?.losses || data.losses || 0;

    console.log('\n=== 최종 추출된 티어 정보 ===');
    console.log(`티어: ${tier}`);
    console.log(`등급: ${division}`);
    console.log(`LP: ${lp}`);
    console.log(`전적: ${wins}승 ${losses}패`);

    if (tier === 'UNRANKED') {
      console.log('⚠️  언랭크 상태 - 랭크 게임을 플레이하지 않았거나 배치고사 미완료');
    } else {
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
      console.log(`승률: ${winRate}% (총 ${totalGames}게임)`);
    }
    console.log('=====================================');

    // 승률 계산 - 실제 플레이한 게임 수 기준
    const totalGames = wins + losses;
    const overallWinRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 50;
    // 최근 게임 승률을 메인으로 사용 (실제 게임 수 기준)
    const recentWinRate = data.recentStats?.winRate || data.recentMatches?.winRate || overallWinRate;

    // 주/부 포지션 결정 (개선된 로직)
    const positionEntries = Object.entries(data.positions || {});
    positionEntries.sort(([,a], [,b]) => b - a);
    const mainRole = positionEntries[0]?.[0] || 'MID';
    const subRole = positionEntries[1]?.[0] || null;

    console.log('\n포지션 분석:');
    console.log('포지션 통계:', data.positions);
    console.log(`주 포지션: ${mainRole}`);
    console.log(`부 포지션: ${subRole || '없음'}`);

    // 포지션별 숙련도 계산 (개선된 로직 - algorithm.md 기준)
    const roleProficiency = {
      TOP: 0,
      JUNGLE: 0,
      MID: 0,
      ADC: 0,
      SUPPORT: 0
    };

    // 각 포지션에 대한 숙련도 계산 (0-10점)
    const totalPositionGames = Object.values(data.positions || {}).reduce((sum, count) => sum + count, 0);

    for (const [position, gameCount] of Object.entries(data.positions || {})) {
      if (position in roleProficiency) {
        // 게임 수 비율에 따른 숙련도 계산
        const gameRatio = totalPositionGames > 0 ? gameCount / totalPositionGames : 0;

        if (position === mainRole) {
          // 주 포지션은 최소 7점에서 시작
          roleProficiency[position] = Math.min(10, Math.max(7, Math.round(7 + gameRatio * 3)));
        } else if (position === subRole) {
          // 부 포지션은 최소 5점에서 시작
          roleProficiency[position] = Math.min(8, Math.max(5, Math.round(5 + gameRatio * 3)));
        } else if (gameCount > 0) {
          // 간혹 플레이한 포지션
          roleProficiency[position] = Math.min(5, Math.max(1, Math.round(gameRatio * 10)));
        } else {
          // 플레이 경험 없음
          roleProficiency[position] = 0;
        }
      }
    }

    console.log('\n계산된 포지션 숙련도:');
    console.log(roleProficiency);

    // 통계 데이터 추출 (recentStats 우선 사용)
    const avgKDA = data.recentStats?.avgKDA || data.recentMatches?.avgKDA || 2.0;
    const csPerMin = data.recentStats?.avgCSPerMin || data.recentMatches?.avgCS || 5.5;
    const visionScorePerMin = data.recentStats?.avgVisionScorePerMin || data.recentMatches?.avgVisionScore || 1.2;

    // 추가 통계 데이터 - 현재는 사용하지 않지만 향후 확장을 위해 보관
    // const avgKills = data.recentMatches?.avgKills || 5.0;
    // const avgDeaths = data.recentMatches?.avgDeaths || 4.0;
    // const avgAssists = data.recentMatches?.avgAssists || 8.0;

    // 서포터인 경우 팀 기여도 계산 (개선된 로직)
    let teamContribution = 50; // 기본값 50% (평균)

    if (mainRole === 'SUPPORT') {
      // 서포터의 경우 킬 관여율, CC시간, 힐/실드량 기반 (recentStats 우선 사용)
      const killParticipation = data.recentStats?.avgKillParticipation || data.recentMatches?.avgKillParticipation || 50;
      const ccTime = data.recentStats?.avgCCTime || data.recentMatches?.avgCCTime || 0;
      const healing = data.recentStats?.avgHealing || data.recentMatches?.avgHealing || 0;
      const shielding = data.recentStats?.avgShielding || data.recentMatches?.avgShielding || 0;

      const ccContribution = ccTime > 0 ? Math.min(30, (ccTime / 20) * 30) : 10;
      const healShieldContribution = (healing + shielding) > 0 ? Math.min(20, ((healing + shielding) / 10000) * 20) : 10;

      // 팀 기여도 백분위 계산 (0-100)
      teamContribution = Math.min(100, Math.max(0,
        (killParticipation * 0.5) + ccContribution + healShieldContribution
      ));

      console.log('\n서포터 팀 기여도 계산:');
      console.log(`킬 관여율: ${killParticipation}%`);
      console.log(`CC 기여도: ${ccContribution.toFixed(1)}`);
      console.log(`힐/실드 기여도: ${healShieldContribution.toFixed(1)}`);
      console.log(`총 팀 기여도: ${teamContribution.toFixed(1)}%`);
    } else {
      // 다른 포지션의 경우 KDA와 킬 관여율 기반 (recentStats 우선 사용)
      const killParticipation = data.recentStats?.avgKillParticipation || data.recentMatches?.avgKillParticipation || 50;
      teamContribution = Math.min(100, Math.max(0,
        (killParticipation * 0.7) + (avgKDA * 5)
      ));
    }

    const profile = createPlayerProfile({
      name: playerName,
      summonerName: data.riotId || data.gameName || data.name || playerName,
      puuid: data.puuid,
      tier: tier,
      division: division,
      lp: lp,
      winRate: overallWinRate,      // 전체 승률
      recentWinRate: recentWinRate, // 최근 20게임 승률 (algorithm.md 기준)
      avgKDA: avgKDA,
      csPerMin: csPerMin,
      visionScorePerMin: visionScorePerMin,
      teamContribution: Math.round(teamContribution),
      mainRole: mainRole,
      subRole: subRole,
      roleProficiency: roleProficiency,
      lastUpdated: new Date().toISOString().split('T')[0],
      isFromAPI: true
    });

    // 최종 점수 계산 로그
    console.log('\n=== 최종 점수 계산 결과 ===');
    console.log(`종합 실력 점수: ${profile.totalSkillScore}점/100점`);
    console.log(`라인 숙련도 점수: ${profile.roleScore}점/50점`);
    console.log(`총점: ${profile.overallScore}점/150점`);
    console.log('========================\n');

    return profile;
  },

  /**
   * 플레이어 정보 업데이트 (API에서 최신 데이터 가져오기)
   * @param {Object} player - 업데이트할 플레이어 객체
   * @returns {Promise<Object>} - 업데이트된 플레이어 프로필
   */
  async updatePlayerData(player) {
    if (!player.summonerName) {
      return { success: false, error: '소환사명이 없습니다.' };
    }

    const result = await this.searchSummoner(player.summonerName);
    if (!result.success) {
      return result;
    }

    const updatedProfile = this.convertToPlayerProfile(result.data, player.name);
    return { success: true, data: updatedProfile };
  },

  /**
   * 캐시 관리
   */
  cache: {
    clear: () => apiCache.clear(),
    get: (key) => apiCache.get(key),
    set: (key, data, duration) => apiCache.set(key, data, duration)
  },

  /**
   * API 설정 변경
   */
  setConfig: (config) => {
    Object.assign(RIOT_API_CONFIG, config);
  },

  /**
   * 현재 설정 반환
   */
  getConfig: () => ({ ...RIOT_API_CONFIG })
};

export default RiotAPI;