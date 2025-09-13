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
      console.log('\n=== League API 응답 ===');
      console.log('전체 데이터:', JSON.stringify(leagueData, null, 2));

      // 솔로랭크와 자유랭크 분리
      soloRank = leagueData.find(entry => entry.queueType === 'RANKED_SOLO_5x5') || null;
      flexRank = leagueData.find(entry => entry.queueType === 'RANKED_FLEX_SR') || null;

      if (soloRank) {
        console.log('\n=== 솔로랭크 정보 ===');
        console.log(`티어: ${soloRank.tier} ${soloRank.rank}`);
        console.log(`LP: ${soloRank.leaguePoints}`);
        console.log(`승/패: ${soloRank.wins}승 ${soloRank.losses}패`);
        console.log(`승률: ${Math.round((soloRank.wins / (soloRank.wins + soloRank.losses)) * 100)}%`);
      }

      if (flexRank) {
        console.log('\n=== 자유랭크 정보 ===');
        console.log(`티어: ${flexRank.tier} ${flexRank.rank}`);
        console.log(`LP: ${flexRank.leaguePoints}`);
        console.log(`승/패: ${flexRank.wins}승 ${flexRank.losses}패`);
      }
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

        // 최근 20경기 정보 가져오기 (algorithm.md에서 요구하는 20게임)
        const recentMatches = matchIds.slice(0, Math.min(20, matchIds.length));
        const matchDetails = [];
        console.log(`\n=== 매치 히스토리 분석 ===`);
        console.log(`분석할 매치 수: ${recentMatches.length}/20`);

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
                // BOTTOM 포지션 세분화
                if (position === 'BOTTOM') {
                  // 서포터 아이템이나 낮은 CS로 판단
                  const csPerMin = (playerData.totalMinionsKilled + playerData.neutralMinionsKilled) / (matchData.info.gameDuration / 60);
                  if (csPerMin < 3) {
                    position = 'SUPPORT';
                  } else {
                    position = 'ADC';
                  }
                }

                // 서포터 전용 통계 추가
                const gameDurationMinutes = matchData.info.gameDuration / 60;
                const visionScorePerMin = playerData.visionScore / gameDurationMinutes;
                const totalCS = playerData.totalMinionsKilled + (playerData.neutralMinionsKilled || 0);
                const csPerMin = totalCS / gameDurationMinutes;

                // CC 시간, 힐/실드량 계산 (서포터용)
                const ccTime = playerData.totalTimeCCDealt || 0;
                const healingDone = playerData.totalHealsOnTeammates || 0;
                const shieldingDone = playerData.totalDamageShieldedOnTeammates || 0;

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
                  visionScorePerMin: visionScorePerMin,
                  csPerMin: csPerMin,
                  totalDamageDealtToChampions: playerData.totalDamageDealtToChampions,
                  goldEarned: playerData.goldEarned,
                  // 포지션 정보 개선
                  teamPosition: position,
                  individualPosition: playerData.individualPosition || '',
                  role: playerData.role || '',
                  lane: playerData.lane || '',
                  // 서포터 전용 통계
                  totalTimeCCDealt: ccTime,
                  totalHealsOnTeammates: healingDone,
                  totalDamageShieldedOnTeammates: shieldingDone,
                  // 추가 통계
                  kda: playerData.deaths === 0 ? 99 : (playerData.kills + playerData.assists) / playerData.deaths,
                  killParticipation: playerData.challenges?.killParticipation || 0
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

      // 서포터 전용 통계 계산
      const totalCCTime = matchHistory.reduce((sum, match) => sum + (match.totalTimeCCDealt || 0), 0);
      const totalHealing = matchHistory.reduce((sum, match) => sum + (match.totalHealsOnTeammates || 0), 0);
      const totalShielding = matchHistory.reduce((sum, match) => sum + (match.totalDamageShieldedOnTeammates || 0), 0);
      const avgKillParticipation = matchHistory.reduce((sum, match) => sum + (match.killParticipation || 0), 0) / matchHistory.length;

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
        positions: positionCounts,
        // 서포터 전용 통계
        avgCCTime: Number((totalCCTime / matchHistory.length).toFixed(1)),
        avgHealing: Math.round(totalHealing / matchHistory.length),
        avgShielding: Math.round(totalShielding / matchHistory.length),
        avgKillParticipation: Number((avgKillParticipation * 100).toFixed(1))
      };

      console.log('\n=== 계산된 통계 (최근 20게임) ===');
      console.log(`게임 수: ${recentStats.gamesPlayed}`);
      console.log(`승률: ${recentStats.winRate}% (${recentStats.wins}승 ${recentStats.gamesPlayed - recentStats.wins}패)`);
      console.log(`KDA: ${recentStats.avgKDA} (${recentStats.avgKills}/${recentStats.avgDeaths}/${recentStats.avgAssists})`);
      console.log(`분당 CS: ${recentStats.avgCSPerMin}`);
      console.log(`분당 시야점수: ${recentStats.avgVisionScorePerMin}`);
      console.log('포지션 통계:', recentStats.positions);
      console.log('킬 관여율:', recentStats.avgKillParticipation + '%');
    }

    // 4단계: 챔피언 마스터리 데이터 조회 (포지션 숙련도 판단용)
    let championMastery = null;
    try {
      const masteryUrl = `https://kr.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${accountData.puuid}`;
      const masteryResponse = await fetch(masteryUrl, {
        headers: {
          'X-Riot-Token': riotApiKey,
          'User-Agent': 'LOL-Team-Balance/1.0.0'
        }
      });

      if (masteryResponse.ok) {
        championMastery = await masteryResponse.json();
        console.log(`\n=== 챔피언 마스터리 데이터 ===`);
        console.log(`총 챔피언 수: ${championMastery.length}`);
        if (championMastery.length > 0) {
          console.log('상위 5개 챔피언:');
          championMastery.slice(0, 5).forEach((champ, idx) => {
            console.log(`  ${idx + 1}. 챔피언ID: ${champ.championId}, 레벨: ${champ.championLevel}, 포인트: ${champ.championPoints}`);
          });
        }
      }
    } catch (masteryError) {
      console.warn('챔피언 마스터리 조회 실패:', masteryError);
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

      // 챔피언 마스터리
      championMastery: championMastery,

      // 메타데이터
      lastUpdated: new Date().toISOString(),
      dataSource: 'riot_api'
    };

    // 최종 데이터 요약 로그
    console.log('\n=== 최종 데이터 요약 ===');
    console.log(`플레이어: ${playerData.riotId}`);
    console.log(`솔로랭크: ${playerData.soloRank ? `${playerData.soloRank.tier} ${playerData.soloRank.rank}` : '언랭크'}`);
    console.log(`최근 20게임 승률: ${playerData.recentStats?.winRate || 0}%`);
    console.log(`평균 KDA: ${playerData.recentStats?.avgKDA || 0}`);
    console.log(`주 포지션: ${Object.keys(playerData.recentStats?.positions || {}).sort((a, b) =>
      (playerData.recentStats.positions[b] || 0) - (playerData.recentStats.positions[a] || 0))[0] || '알 수 없음'}`);
    console.log('========================\n');

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