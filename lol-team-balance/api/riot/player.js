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

    // Riot API 키 확인 및 상세 로깅
    const riotApiKey = process.env.RIOT_API_KEY;
    console.log('\n=== API 키 상태 확인 ===');
    console.log(`API 키 존재: ${riotApiKey ? 'YES' : 'NO'}`);
    console.log(`API 키 길이: ${riotApiKey ? riotApiKey.length : 0}`);
    console.log(`API 키 형식: ${riotApiKey ? `${riotApiKey.substring(0, 8)}...${riotApiKey.substring(riotApiKey.length - 4)}` : 'N/A'}`);
    console.log('=============================\n');

    if (!riotApiKey) {
      console.error('RIOT_API_KEY 환경변수가 설정되지 않았습니다.');
      return res.status(500).json({
        error: 'API 설정 오류가 발생했습니다. 환경변수를 확인하세요.',
        code: 'API_KEY_MISSING'
      });
    }

    // 1단계: Account API로 PUUID 조회 (Regional Endpoint 사용)
    const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

    console.log('\n=== 1단계: Account API 호출 ===');
    console.log(`URL: ${accountUrl}`);
    console.log(`Regional Endpoint: asia.api.riotgames.com (정확함)`);
    console.log('================================');

    const accountResponse = await fetch(accountUrl, {
      headers: {
        'X-Riot-Token': riotApiKey,
        'User-Agent': 'LOL-Team-Balance/1.0.0'
      }
    });

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('\n=== Account API 실패 ===');
      console.error(`상태 코드: ${accountResponse.status}`);
      console.error(`오류 응답: ${errorText}`);
      console.error('=========================');

      if (accountResponse.status === 404) {
        return res.status(404).json({
          error: `플레이어를 찾을 수 없습니다: ${gameName}#${tagLine}`,
          code: 'PLAYER_NOT_FOUND',
          step: 'account_lookup'
        });
      }
      return res.status(500).json({
        error: `Account API 호출 실패 (${accountResponse.status})`,
        code: 'ACCOUNT_API_ERROR',
        step: 'account_lookup',
        details: errorText
      });
    }

    const accountData = await accountResponse.json();
    console.log('\n=== Account API 성공 ===');
    console.log(`PUUID 획득: ${accountData.puuid}`);
    console.log(`게임명: ${accountData.gameName}#${accountData.tagLine}`);
    console.log('=========================');

    // 2단계: Summoner API로 소환사 정보 조회 (Platform Endpoint 사용)
    const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`;

    console.log('\n=== 2단계: Summoner API 호출 ===');
    console.log(`URL: ${summonerUrl}`);
    console.log(`Platform Endpoint: kr.api.riotgames.com (정확함)`);
    console.log(`입력 PUUID: ${accountData.puuid}`);
    console.log('===================================');

    const summonerResponse = await fetch(summonerUrl, {
      headers: {
        'X-Riot-Token': riotApiKey,
        'User-Agent': 'LOL-Team-Balance/1.0.0'
      }
    });

    if (!summonerResponse.ok) {
      const errorText = await summonerResponse.text();
      console.error('\n=== Summoner API 실패 ===');
      console.error(`상태 코드: ${summonerResponse.status}`);
      console.error(`오류 응답: ${errorText}`);
      console.error('============================');

      return res.status(500).json({
        error: `Summoner API 호출 실패 (${summonerResponse.status})`,
        code: 'SUMMONER_API_ERROR',
        step: 'summoner_lookup',
        details: errorText
      });
    }

    const summonerData = await summonerResponse.json();
    console.log('\n=== Summoner API 성공 ===');
    console.log(`encryptedSummonerId 획득: ${summonerData.id}`);
    console.log(`소환사명: ${summonerData.name}`);
    console.log(`소환사 레벨: ${summonerData.summonerLevel}`);
    console.log('=============================');

    // 3단계: League API로 랭크 정보 조회 (PUUID 기반 엔드포인트)
    const leagueUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-puuid/${accountData.puuid}`;

    console.log('\n=== 3단계: League API 호출 ===');
    console.log(`URL: ${leagueUrl}`);
    console.log(`Platform Endpoint: kr.api.riotgames.com (정확함)`);
    console.log(`입력 PUUID: ${accountData.puuid}`);
    console.log(`⚠️ 중요: 언랭크 플레이어의 경우 빈 배열 [] 응답이 정상임`);
    console.log('==================================');

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
      console.log('\n=== League API 응답 상세 분석 ===');
      console.log(`✅ 응답 상태: ${leagueResponse.status} ${leagueResponse.statusText}`);
      console.log(`📊 랭크 데이터 개수: ${leagueData.length}`);
      console.log(`📋 응답 타입: ${Array.isArray(leagueData) ? 'Array' : typeof leagueData}`);
      console.log('🔍 전체 원본 데이터:');
      console.log(JSON.stringify(leagueData, null, 2));

      // 각 랭크 정보 상세 분석
      if (leagueData.length > 0) {
        console.log('\n📈 랭크 엔트리별 상세 분석:');
        leagueData.forEach((entry, index) => {
          console.log(`  [${index}] ${entry.queueType}:`);
          console.log(`      - 티어: ${entry.tier || 'NULL'}`);
          console.log(`      - 등급: ${entry.rank || 'NULL'}`);
          console.log(`      - LP: ${entry.leaguePoints || 0}`);
          console.log(`      - 승패: ${entry.wins || 0}승 ${entry.losses || 0}패`);
          console.log(`      - 소환사ID: ${entry.summonerId?.substring(0, 10)}...`);
        });
      } else {
        console.log('⚠️ 랭크 데이터가 비어있음 - 완전 언랭크 상태');
      }
      console.log('=======================================');

      // 솔로랭크와 자유랭크 분리
      soloRank = leagueData.find(entry => entry.queueType === 'RANKED_SOLO_5x5') || null;
      flexRank = leagueData.find(entry => entry.queueType === 'RANKED_FLEX_SR') || null;

      console.log('\n=== 랭크 데이터 분석 ===');
      console.log(`솔로랭크 발견: ${soloRank ? 'YES' : 'NO'}`);
      console.log(`자유랭크 발견: ${flexRank ? 'YES' : 'NO'}`);

      if (soloRank) {
        console.log('\n=== 솔로랭크 정보 ===');
        console.log(`티어: ${soloRank.tier} ${soloRank.rank}`);
        console.log(`LP: ${soloRank.leaguePoints}`);
        console.log(`승/패: ${soloRank.wins}승 ${soloRank.losses}패`);
        const winRate = soloRank.wins + soloRank.losses > 0 ?
          Math.round((soloRank.wins / (soloRank.wins + soloRank.losses)) * 100) : 0;
        console.log(`승률: ${winRate}%`);
      } else {
        console.log('\n=== 솔로랭크 정보 ===');
        console.log('솔로랭크 데이터를 찾을 수 없음.');
        if (leagueData.length === 0) {
          console.log('원인: 완전 언랭크 상태 (랭크 게임 미플레이)');
        } else {
          console.log('원인: 솔로랭크가 아닌 다른 큐 타입만 존재');
          console.log('존재하는 큐 타입들:', leagueData.map(entry => entry.queueType));
        }
      }

      if (flexRank) {
        console.log('\n=== 자유랭크 정보 ===');
        console.log(`티어: ${flexRank.tier} ${flexRank.rank}`);
        console.log(`LP: ${flexRank.leaguePoints}`);
        console.log(`승/패: ${flexRank.wins}승 ${flexRank.losses}패`);
      } else if (!soloRank) {
        console.log('\n=== 자유랭크 정보 ===');
        console.log('자유랭크 데이터도 없음. 완전 언랭크 상태.');
      }

      // 언랭크 상태 최종 판단 및 정상 처리
      if (!soloRank && !flexRank && leagueData.length === 0) {
        console.log('\n✅ 정상: 언랭크 플레이어 (빈 배열 응답)');
        console.log('- 솔로/듀오 랭크: 미플레이 (정상)');
        console.log('- 자유랭크: 미플레이 (정상)');
        console.log('- 상태: 배치고사 미완료 또는 랭크 게임 미참여');
        console.log('- 처리 방법: 기본값 UNRANKED로 설정');
      } else if (soloRank || flexRank) {
        console.log('\n✅ 정상: 랭크 플레이어 발견');
        console.log(`- 사용할 랭크: ${soloRank ? '솔로랭크' : '자유랭크'}`);
      } else {
        console.log('\n⚠️ 특수 상황: 기타 큐 타입만 존재');
        console.log('- 알려진 큐 타입들:', leagueData.map(entry => entry.queueType));
      }

      console.log('=================================\n');
    } else {
      const errorText = await leagueResponse.text();
      console.error('\n=== League API 호출 실패 ===');
      console.error(`상태 코드: ${leagueResponse.status}`);
      console.error(`상태 텍스트: ${leagueResponse.statusText}`);
      console.error(`오류 내용: ${errorText}`);
      console.error('===============================\n');
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
                // 포지션 결정 로직 개선 - Riot API 포지션 매핑
                let position = playerData.teamPosition || playerData.individualPosition || '';

                // Riot API 포지션 값을 내부 값으로 매핑
                const positionMapping = {
                  'TOP': 'TOP',
                  'JUNGLE': 'JUNGLE',
                  'MIDDLE': 'MID',  // Riot API에서는 MIDDLE로 전달
                  'MID': 'MID',     // 호환성을 위해 유지
                  'BOTTOM': 'TEMP_BOTTOM', // 임시 값 - 아래에서 ADC/SUPPORT 구분
                  'UTILITY': 'SUPPORT',
                  'SUPPORT': 'SUPPORT'
                };

                position = positionMapping[position] || position;

                // 빈 포지션 처리
                if (!position) {
                  position = 'SUPPORT'; // 기본값
                }

                // BOTTOM 포지션 세분화 (ADC vs SUPPORT)
                if (position === 'TEMP_BOTTOM') {
                  // 서포터 아이템이나 낮은 CS로 판단
                  const csPerMin = (playerData.totalMinionsKilled + playerData.neutralMinionsKilled) / (matchData.info.gameDuration / 60);
                  if (csPerMin < 3) {
                    position = 'SUPPORT';
                  } else {
                    position = 'ADC';
                  }
                }

                console.log(`게임 ${matchId}: 원본 포지션=${playerData.teamPosition || playerData.individualPosition}, 최종 포지션=${position}`);

                // 게임별 분당 통계 계산 (각 게임별로 개별 계산)
                const gameDurationMinutes = matchData.info.gameDuration / 60;
                const visionScorePerMin = playerData.visionScore / gameDurationMinutes;
                const totalCS = playerData.totalMinionsKilled + (playerData.neutralMinionsKilled || 0);
                const csPerMin = totalCS / gameDurationMinutes;

                console.log(`게임 ${matchId}: ${totalCS}CS, ${gameDurationMinutes.toFixed(1)}분, 분당CS: ${csPerMin.toFixed(1)}`);

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
        if (position && position !== 'UNKNOWN' && position !== 'TEMP_BOTTOM') {
          positionCounts[position] = (positionCounts[position] || 0) + 1;
        }
      });

      console.log('\n포지션 통계 상세:');
      console.log('전체 매치 포지션:', matchHistory.map(m => m.teamPosition));
      console.log('집계된 포지션 통계:', positionCounts);

      // 분당 통계 계산 - 각 게임별 분당 값을 평균내는 방식으로 수정
      const totalGameMinutes = totalGameTime / 60;
      const avgGameMinutes = totalGameMinutes / matchHistory.length;

      // 각 게임별 분당 CS를 계산한 후 평균
      const individualCSPerMin = matchHistory.map(match => match.csPerMin);
      const avgCSPerMin = individualCSPerMin.reduce((sum, cs) => sum + cs, 0) / matchHistory.length;

      // 각 게임별 분당 시야점수를 계산한 후 평균
      const individualVisionPerMin = matchHistory.map(match => match.visionScorePerMin);
      const avgVisionScorePerMin = individualVisionPerMin.reduce((sum, vision) => sum + vision, 0) / matchHistory.length;

      // 서포터 전용 통계 계산
      const totalCCTime = matchHistory.reduce((sum, match) => sum + (match.totalTimeCCDealt || 0), 0);
      const totalHealing = matchHistory.reduce((sum, match) => sum + (match.totalHealsOnTeammates || 0), 0);
      const totalShielding = matchHistory.reduce((sum, match) => sum + (match.totalDamageShieldedOnTeammates || 0), 0);
      const avgKillParticipation = matchHistory.reduce((sum, match) => sum + (match.killParticipation || 0), 0) / matchHistory.length;

      recentStats = {
        gamesPlayed: matchHistory.length,
        wins: wins,
        winRate: Math.round((wins / matchHistory.length) * 100),
        // KDA 계산 개선 - 소수점 첫째자리까지
        avgKDA: totalDeaths > 0 ? Number(((totalKills + totalAssists) / totalDeaths).toFixed(1)) : 99.0,
        avgKills: Number((totalKills / matchHistory.length).toFixed(1)),
        avgDeaths: Number((totalDeaths / matchHistory.length).toFixed(1)),
        avgAssists: Number((totalAssists / matchHistory.length).toFixed(1)),
        // 분당 CS 계산 - 각 게임별 분당 CS의 평균
        avgCS: Number((totalCS / matchHistory.length).toFixed(1)),
        avgCSPerMin: Number(avgCSPerMin.toFixed(1)),
        // 분당 비전 스코어 - 각 게임별 분당 시야점수의 평균
        avgVisionScore: Number((totalVision / matchHistory.length).toFixed(1)),
        avgVisionScorePerMin: Number(avgVisionScorePerMin.toFixed(1)),
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
      console.log(`분당 CS: ${recentStats.avgCSPerMin} (각 게임별 분당CS의 평균)`);
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

      // 랭크 정보 (League API v4에서 제공)
      soloRank: soloRank || null, // RANKED_SOLO_5x5
      flexRank: flexRank || null, // RANKED_FLEX_SR
      allRanks: leagueData, // 전체 랭크 배열 (언랭크면 빈 배열)
      isUnranked: leagueData.length === 0, // 언랭크 여부 명시적 표시

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

    // 최종 응답 데이터 구조 검증 로그
    console.log('\n=== 🔍 최종 응답 데이터 구조 검증 ===');
    console.log(`📤 전송할 데이터 구조:`);
    console.log(`  - soloRank: ${playerData.soloRank ? 'EXISTS' : 'NULL'}`);
    console.log(`  - flexRank: ${playerData.flexRank ? 'EXISTS' : 'NULL'}`);
    console.log(`  - allRanks: Array[${playerData.allRanks.length}]`);
    console.log(`  - isUnranked: ${playerData.isUnranked}`);
    console.log(`  - recentStats: ${playerData.recentStats ? 'EXISTS' : 'NULL'}`);

    if (playerData.soloRank) {
      console.log(`📊 soloRank 상세:`, {
        queueType: playerData.soloRank.queueType,
        tier: playerData.soloRank.tier,
        rank: playerData.soloRank.rank,
        leaguePoints: playerData.soloRank.leaguePoints
      });
    }

    if (playerData.allRanks.length > 0) {
      console.log(`📊 allRanks 배열 내용:`);
      playerData.allRanks.forEach((rank, i) => {
        console.log(`  [${i}]: ${rank.queueType} ${rank.tier} ${rank.rank}`);
      });
    }

    // API 호출 체인 성공 확인
    console.log('\n=== 🎉 API 호출 체인 성공! ===');
    console.log(`✅ 1단계: Account API → PUUID 획득`);
    console.log(`✅ 2단계: Summoner API → encryptedSummonerId 획득`);
    console.log(`✅ 3단계: League API → 티어 정보 ${playerData.isUnranked ? '없음(정상)' : '획득'}`);
    console.log('=====================================\n');

    console.log('=== 📊 최종 플레이어 데이터 ===');
    console.log(`플레이어: ${playerData.riotId} (레벨 ${playerData.summonerLevel})`);

    // 티어 정보 상세 출력
    if (playerData.soloRank) {
      console.log(`🏆 솔로랭크: ${playerData.soloRank.tier} ${playerData.soloRank.rank} (${playerData.soloRank.leaguePoints} LP)`);
      const soloWinRate = Math.round((playerData.soloRank.wins / (playerData.soloRank.wins + playerData.soloRank.losses)) * 100);
      console.log(`   전적: ${playerData.soloRank.wins}승 ${playerData.soloRank.losses}패 (승률 ${soloWinRate}%)`);
    } else if (playerData.flexRank) {
      console.log(`🏆 자유랭크: ${playerData.flexRank.tier} ${playerData.flexRank.rank} (${playerData.flexRank.leaguePoints} LP)`);
      const flexWinRate = Math.round((playerData.flexRank.wins / (playerData.flexRank.wins + playerData.flexRank.losses)) * 100);
      console.log(`   전적: ${playerData.flexRank.wins}승 ${playerData.flexRank.losses}패 (승률 ${flexWinRate}%)`);
    } else {
      console.log(`🚫 랭크: UNRANKED (배치고사 미완료 또는 랭크 게임 미참여)`);
    }

    // 게임 통계 정보
    console.log(`📈 최근 20게임 승률: ${playerData.recentStats?.winRate || 0}%`);
    console.log(`⚔️ 평균 KDA: ${playerData.recentStats?.avgKDA || 0}`);
    console.log(`🥕 분당 CS: ${playerData.recentStats?.avgCSPerMin || 0}`);

    const mainPosition = Object.keys(playerData.recentStats?.positions || {}).sort((a, b) =>
      (playerData.recentStats.positions[b] || 0) - (playerData.recentStats.positions[a] || 0))[0] || '알 수 없음';
    console.log(`🎯 주 포지션: ${mainPosition}`);
    console.log(`📊 포지션 분포:`, playerData.recentStats?.positions || '없음');
    console.log('================================\n');

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