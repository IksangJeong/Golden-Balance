// Vercel Function: 통합 플레이어 정보 API
// 경로: /api/riot/player?gameName=닉네임&tagLine=태그

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameName, tagLine } = req.query;

    // 파라미터 검증
    if (!gameName || !tagLine) {
      return res.status(400).json({
        error: 'gameName과 tagLine 파라미터가 필요합니다.',
        example: '/api/riot/player?gameName=닉네임&tagLine=KR1'
      });
    }

    // Riot API 키 확인
    const riotApiKey = process.env.RIOT_API_KEY;
    if (!riotApiKey) {
      console.error('RIOT_API_KEY 환경변수가 설정되지 않았습니다.');
      return res.status(500).json({
        error: 'API 설정 오류가 발생했습니다.'
      });
    }

    // 1단계: Account API로 PUUID 조회
    const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

    const accountResponse = await fetch(accountUrl, {
      headers: {
        'X-Riot-Token': riotApiKey,
        'User-Agent': 'LOL-Team-Balance/1.0.0'
      }
    });

    if (!accountResponse.ok) {
      if (accountResponse.status === 404) {
        return res.status(404).json({
          error: `플레이어를 찾을 수 없습니다: ${gameName}#${tagLine}`,
          code: 'PLAYER_NOT_FOUND'
        });
      }
      throw new Error(`Account API 오류: ${accountResponse.status}`);
    }

    const accountData = await accountResponse.json();

    // 2단계: Summoner API로 소환사 정보 조회
    const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`;

    const summonerResponse = await fetch(summonerUrl, {
      headers: {
        'X-Riot-Token': riotApiKey,
        'User-Agent': 'LOL-Team-Balance/1.0.0'
      }
    });

    if (!summonerResponse.ok) {
      throw new Error(`Summoner API 오류: ${summonerResponse.status}`);
    }

    const summonerData = await summonerResponse.json();

    // 3단계: League API로 랭크 정보 조회
    const leagueUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerData.id}`;

    const leagueResponse = await fetch(leagueUrl, {
      headers: {
        'X-Riot-Token': riotApiKey,
        'User-Agent': 'LOL-Team-Balance/1.0.0'
      }
    });

    let leagueData = [];
    if (leagueResponse.ok) {
      leagueData = await leagueResponse.json();
    }

    // 4단계: 최근 매치 데이터 조회 (선택적)
    let matchHistory = null;
    try {
      const matchListUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${accountData.puuid}/ids?start=0&count=20`;

      const matchListResponse = await fetch(matchListUrl, {
        headers: {
          'X-Riot-Token': riotApiKey,
          'User-Agent': 'LOL-Team-Balance/1.0.0'
        }
      });

      if (matchListResponse.ok) {
        const matchIds = await matchListResponse.json();

        // 최근 5경기 정보만 가져오기 (API 호출 최소화)
        const recentMatches = matchIds.slice(0, 5);
        const matchDetails = [];

        for (const matchId of recentMatches) {
          try {
            const matchUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`;
            const matchResponse = await fetch(matchUrl, {
              headers: {
                'X-Riot-Token': riotApiKey,
                'User-Agent': 'LOL-Team-Balance/1.0.0'
              }
            });

            if (matchResponse.ok) {
              const matchData = await matchResponse.json();
              const playerData = matchData.info.participants.find(
                participant => participant.puuid === accountData.puuid
              );

              if (playerData) {
                matchDetails.push({
                  matchId: matchId,
                  gameMode: matchData.info.gameMode,
                  gameDuration: matchData.info.gameDuration,
                  win: playerData.win,
                  kills: playerData.kills,
                  deaths: playerData.deaths,
                  assists: playerData.assists,
                  championName: playerData.championName,
                  totalMinionsKilled: playerData.totalMinionsKilled,
                  visionScore: playerData.visionScore,
                  totalDamageDealtToChampions: playerData.totalDamageDealtToChampions,
                  goldEarned: playerData.goldEarned,
                  teamPosition: playerData.teamPosition
                });
              }
            }
          } catch (matchError) {
            console.warn(`매치 ${matchId} 데이터 조회 실패:`, matchError);
          }
        }

        matchHistory = matchDetails;
      }
    } catch (matchError) {
      console.warn('매치 히스토리 조회 실패:', matchError);
    }

    // 데이터 통합 및 가공
    const soloRank = leagueData.find(rank => rank.queueType === 'RANKED_SOLO_5x5');
    const flexRank = leagueData.find(rank => rank.queueType === 'RANKED_FLEX_SR');

    // 최근 경기 통계 계산
    let recentStats = null;
    if (matchHistory && matchHistory.length > 0) {
      const wins = matchHistory.filter(match => match.win).length;
      const totalKills = matchHistory.reduce((sum, match) => sum + match.kills, 0);
      const totalDeaths = matchHistory.reduce((sum, match) => sum + match.deaths, 0);
      const totalAssists = matchHistory.reduce((sum, match) => sum + match.assists, 0);
      const totalCS = matchHistory.reduce((sum, match) => sum + match.totalMinionsKilled, 0);
      const totalVision = matchHistory.reduce((sum, match) => sum + match.visionScore, 0);
      const totalDamage = matchHistory.reduce((sum, match) => sum + match.totalDamageDealtToChampions, 0);
      const totalGold = matchHistory.reduce((sum, match) => sum + match.goldEarned, 0);
      const totalGameTime = matchHistory.reduce((sum, match) => sum + match.gameDuration, 0);

      // 포지션 통계
      const positionCounts = {};
      matchHistory.forEach(match => {
        const position = match.teamPosition || 'UNKNOWN';
        positionCounts[position] = (positionCounts[position] || 0) + 1;
      });

      recentStats = {
        gamesPlayed: matchHistory.length,
        wins: wins,
        winRate: Math.round((wins / matchHistory.length) * 100),
        avgKDA: totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths) : (totalKills + totalAssists),
        avgCS: totalCS / matchHistory.length,
        avgVisionScore: totalVision / matchHistory.length,
        avgDamage: totalDamage / matchHistory.length,
        avgGold: totalGold / matchHistory.length,
        avgGameTime: totalGameTime / matchHistory.length,
        positions: positionCounts
      };
    }

    // 통합 응답 데이터
    const playerData = {
      // Account 정보
      puuid: accountData.puuid,
      gameName: accountData.gameName,
      tagLine: accountData.tagLine,
      riotId: `${accountData.gameName}#${accountData.tagLine}`,

      // Summoner 정보
      summonerId: summonerData.id,
      accountId: summonerData.accountId,
      summonerName: summonerData.name,
      profileIconId: summonerData.profileIconId,
      summonerLevel: summonerData.summonerLevel,
      revisionDate: summonerData.revisionDate,

      // 랭크 정보
      soloRank: soloRank || null,
      flexRank: flexRank || null,
      allRanks: leagueData,

      // 최근 경기 통계
      recentStats: recentStats,

      // 매치 히스토리
      matchHistory: matchHistory,

      // 메타데이터
      lastUpdated: new Date().toISOString(),
      dataSource: 'riot_api'
    };

    // 성공 응답
    return res.status(200).json({
      success: true,
      data: playerData
    });

  } catch (error) {
    console.error('통합 플레이어 API 오류:', error);
    return res.status(500).json({
      error: '서버 내부 오류가 발생했습니다.',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}