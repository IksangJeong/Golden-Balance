// Vercel Function: Riot League API 프록시
// 경로: /api/riot/league?puuid=PUUID

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
    const { puuid } = req.query;

    // 파라미터 검증
    if (!puuid) {
      return res.status(400).json({
        error: 'puuid 파라미터가 필요합니다.',
        example: '/api/riot/league?puuid=PUUID'
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

    // Riot League API 호출 (한국 서버) - PUUID 기반 엔드포인트
    const leagueUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;

    const leagueResponse = await fetch(leagueUrl, {
      headers: {
        'X-Riot-Token': riotApiKey,
        'User-Agent': 'LOL-Team-Balance/1.0.0'
      }
    });

    if (!leagueResponse.ok) {
      // Riot API 에러 응답 처리
      if (leagueResponse.status === 404) {
        // 랭크 정보가 없는 경우 (언랭크)는 정상적인 상황
        return res.status(200).json({
          success: true,
          data: [], // 빈 배열 반환 (언랭크)
          message: '랭크 정보가 없습니다 (언랭크)'
        });
      } else if (leagueResponse.status === 403) {
        return res.status(403).json({
          error: 'API 키가 유효하지 않습니다.',
          code: 'INVALID_API_KEY'
        });
      } else if (leagueResponse.status === 429) {
        return res.status(429).json({
          error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      } else {
        return res.status(leagueResponse.status).json({
          error: `Riot API 오류: ${leagueResponse.status}`,
          code: 'RIOT_API_ERROR'
        });
      }
    }

    const leagueData = await leagueResponse.json();

    // 랭크 데이터 정제 (필요한 정보만 추출)
    const rankedInfo = leagueData.map(entry => ({
      leagueId: entry.leagueId,
      queueType: entry.queueType,
      tier: entry.tier,
      rank: entry.rank,
      summonerId: entry.summonerId,
      summonerName: entry.summonerName,
      leaguePoints: entry.leaguePoints,
      wins: entry.wins,
      losses: entry.losses,
      veteran: entry.veteran,
      inactive: entry.inactive,
      freshBlood: entry.freshBlood,
      hotStreak: entry.hotStreak
    }));

    // 성공 응답
    return res.status(200).json({
      success: true,
      data: rankedInfo
    });

  } catch (error) {
    console.error('League API 프록시 오류:', error);
    return res.status(500).json({
      error: '서버 내부 오류가 발생했습니다.',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}