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
    let soloRank = null;
    let flexRank = null;

    if (leagueResponse.ok) {
      leagueData = await leagueResponse.json();
      console.log('League API 응답:', leagueData); // 디버깅용

      // 솔로랭크와 자유랭크 분리
      soloRank = leagueData.find(entry => entry.queueType === 'RANKED_SOLO_5x5') || null;
      flexRank = leagueData.find(entry => entry.queueType === 'RANKED_FLEX_SR') || null;

      console.log('솔로랭크:', soloRank); // 디버깅용
      console.log('자유랭크:', flexRank); // 디버깅용
    } else {
      console.warn('League API 호출 실패:', leagueResponse.status, await leagueResponse.text());
    }

    // 4단계: 최근 매치 데이터 조회 (선택적)
    let matchHistory = null;
    try {
      // 솔로랭크 게임만 조회 (queue=420)
      const matchListUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${accountData.puuid}/ids?queue=420&start=0&count=20`;

      const matchListResponse = await fetch(matchListUrl, {
        headers: {
          'X-Riot-Token': riotApiKey,
          'User-Agent': 'LOL-Team-Balance/1.0.0'
        }
      });

      if (matchListResponse.ok) {
        const matchIds = await matchListResponse.json();

        // 최근 15경기 정보 가져오기 (정확한 포지션 분석을 위해)
        const recentMatches = matchIds.slice(0, Math.min(15, matchIds.length));
        const matchDetails = [];
        console.log(`분석할 매치 수: ${recentMatches.length}`); // 디버깅용

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

              if (playerData && matchData.info.gameDuration >= 900) { // 15분 이상 게임만
                // 포지션 결정 로직 개선
                let position = playerData.teamPosition || playerData.individualPosition || '';

                // 빈 포지션이나 UTILITY인 경우 서포터로 처리
                if (!position || position === 'UTILITY') {
                  position = 'SUPPORT';
                }

                matchDetails.push({
                  matchId: matchId,
                  queueId: matchData.info.queueId,
                  gameMode: matchData.info.gameMode,
                  gameDuration: matchData.info.gameDuration,
                  win: playerData.win,
                  kills: playerData.kills,
                  deaths: playerData.deaths,
                  assists: playerData.assists,
                  championName: playerData.championName,
                  championId: playerData.championId,
                  totalMinionsKilled: playerData.totalMinionsKilled,
                  neutralMinionsKilled: playerData.neutralMinionsKilled || 0,
                  visionScore: playerData.visionScore,
                  totalDamageDealtToChampions: playerData.totalDamageDealtToChampions,
                  goldEarned: playerData.goldEarned,
                  // 포지션 정보 개선
                  teamPosition: position,
                  individualPosition: playerData.individualPosition || '',
                  role: playerData.role || '',
                  lane: playerData.lane || ''
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

    // 최근 경기 통계 계산 (개선된 로직)
    let recentStats = null;
    if (matchHistory && matchHistory.length > 0) {
      const wins = matchHistory.filter(match => match.win).length;
      const totalKills = matchHistory.reduce((sum, match) => sum + match.kills, 0);
      const totalDeaths = matchHistory.reduce((sum, match) => sum + match.deaths, 0);
      const totalAssists = matchHistory.reduce((sum, match) => sum + match.assists, 0);
      const totalCS = matchHistory.reduce((sum, match) => sum + match.totalMinionsKilled, 0);
      const totalJungleCS = matchHistory.reduce((sum, match) => sum + (match.neutralMinionsKilled || 0), 0);
      const totalVision = matchHistory.reduce((sum, match) => sum + match.visionScore, 0);
      const totalDamage = matchHistory.reduce((sum, match) => sum + match.totalDamageDealtToChampions, 0);
      const totalGold = matchHistory.reduce((sum, match) => sum + match.goldEarned, 0);
      const totalGameTime = matchHistory.reduce((sum, match) => sum + match.gameDuration, 0);

      // 포지션 통계 (개선된 로직)
      const positionCounts = {};
      matchHistory.forEach(match => {
        const position = match.teamPosition;
        if (position && position !== 'UNKNOWN') {
          positionCounts[position] = (positionCounts[position] || 0) + 1;
        }
      });

      // 분당 통계 계산
      const totalGameMinutes = totalGameTime / 60;
      const avgGameMinutes = totalGameMinutes / matchHistory.length;

      recentStats = {
        gamesPlayed: matchHistory.length,
        wins: wins,
        winRate: Math.round((wins / matchHistory.length) * 100),
        // KDA 계산 개선
        avgKDA: totalDeaths > 0 ? Number(((totalKills + totalAssists) / totalDeaths).toFixed(2)) : 99.0,
        avgKills: Number((totalKills / matchHistory.length).toFixed(1)),
        avgDeaths: Number((totalDeaths / matchHistory.length).toFixed(1)),
        avgAssists: Number((totalAssists / matchHistory.length).toFixed(1)),
        // 분당 CS 계산
        avgCS: Number((totalCS / matchHistory.length).toFixed(1)),
        avgCSPerMin: Number(((totalCS + totalJungleCS) / totalGameMinutes).toFixed(1)),
        // 분당 비전 스코어
        avgVisionScore: Number((totalVision / matchHistory.length).toFixed(1)),
        avgVisionScorePerMin: Number((totalVision / totalGameMinutes).toFixed(2)),
        avgDamage: Math.round(totalDamage / matchHistory.length),
        avgGold: Math.round(totalGold / matchHistory.length),
        avgGameTime: Math.round(avgGameMinutes),
        positions: positionCounts
      };

      console.log('계산된 통계:', recentStats); // 디버깅용
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