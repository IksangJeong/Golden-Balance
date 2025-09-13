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
          // 최근 경기 통계를 recentMatches 형식으로 변환
          recentMatches: playerData.data.recentStats ? {
            wins: playerData.data.recentStats.wins,
            total: playerData.data.recentStats.gamesPlayed,
            avgKDA: playerData.data.recentStats.avgKDA,
            avgCS: playerData.data.recentStats.avgCS,
            avgVisionScore: playerData.data.recentStats.avgVisionScore,
            avgDamage: playerData.data.recentStats.avgDamage,
            avgGold: playerData.data.recentStats.avgGold
          } : null,
          // 포지션 정보
          positions: playerData.data.recentStats?.positions || {}
        };
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

    // 랭크 정보 추출 (솔로 랭크 우선)
    const soloRank = data.soloRank || data.rankedInfo?.find(rank => rank.queueType === 'RANKED_SOLO_5x5') || data.rankedInfo?.[0];
    const tier = soloRank?.tier || data.tier || 'UNRANKED';
    const division = soloRank?.rank || data.rank || 'I';
    const lp = soloRank?.leaguePoints || data.leaguePoints || 0;
    const wins = soloRank?.wins || data.wins || 0;
    const losses = soloRank?.losses || data.losses || 0;

    // 승률 계산
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 50;
    const recentWinRate = data.recentMatches ? Math.round((data.recentMatches.wins / data.recentMatches.total) * 100) : winRate;

    // 주/부 포지션 결정
    const positionEntries = Object.entries(data.positions || {});
    positionEntries.sort(([,a], [,b]) => b - a);
    const mainRole = positionEntries[0]?.[0] || 'MID';
    const subRole = positionEntries[1]?.[0] || null;

    // 포지션별 숙련도 계산 (플레이 빈도 기반으로 추정)
    const roleProficiency = {
      TOP: 3,
      JUNGLE: 3,
      MID: 3,
      ADC: 3,
      SUPPORT: 3
    };

    // 주 포지션과 부 포지션에 높은 점수 부여
    if (mainRole) {
      roleProficiency[mainRole] = Math.min(10, 7 + Math.floor((data.positions[mainRole] || 50) / 15));
    }
    if (subRole) {
      roleProficiency[subRole] = Math.min(8, 5 + Math.floor((data.positions[subRole] || 30) / 20));
    }

    // 통계 데이터 추출
    const avgKDA = data.recentMatches?.avgKDA || 2.0;
    const csPerMin = data.recentMatches?.avgCS || 5.5;
    const visionScorePerMin = data.recentMatches?.avgVisionScore || 1.2;

    // 서포터인 경우 팀 기여도 계산
    const teamContribution = mainRole === 'SUPPORT'
      ? Math.min(90, Math.max(20, 40 + (visionScorePerMin - 1.2) * 30))
      : Math.min(90, Math.max(20, 30 + (avgKDA - 2.0) * 15));

    return createPlayerProfile({
      name: playerName,
      summonerName: data.riotId || data.gameName || data.name || playerName,
      puuid: data.puuid,
      tier: tier,
      division: division,
      lp: lp,
      winRate: winRate,
      recentWinRate: recentWinRate,
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