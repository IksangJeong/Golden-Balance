// Vercel Function: Riot Summoner API 프록시
// 경로: /api/riot/summoner?puuid=플레이어_PUUID

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
        example: '/api/riot/summoner?puuid=플레이어_PUUID'
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

    // Riot Summoner API 호출 (한국 서버)
    const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;

    const summonerResponse = await fetch(summonerUrl, {
      headers: {
        'X-Riot-Token': riotApiKey,
        'User-Agent': 'LOL-Team-Balance/1.0.0'
      }
    });

    if (!summonerResponse.ok) {
      // Riot API 에러 응답 처리
      if (summonerResponse.status === 404) {
        return res.status(404).json({
          error: '소환사 정보를 찾을 수 없습니다.',
          code: 'SUMMONER_NOT_FOUND'
        });
      } else if (summonerResponse.status === 403) {
        return res.status(403).json({
          error: 'API 키가 유효하지 않습니다.',
          code: 'INVALID_API_KEY'
        });
      } else if (summonerResponse.status === 429) {
        return res.status(429).json({
          error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      } else {
        return res.status(summonerResponse.status).json({
          error: `Riot API 오류: ${summonerResponse.status}`,
          code: 'RIOT_API_ERROR'
        });
      }
    }

    const summonerData = await summonerResponse.json();

    // 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        id: summonerData.id,
        accountId: summonerData.accountId,
        puuid: summonerData.puuid,
        name: summonerData.name,
        profileIconId: summonerData.profileIconId,
        revisionDate: summonerData.revisionDate,
        summonerLevel: summonerData.summonerLevel
      }
    });

  } catch (error) {
    console.error('Summoner API 프록시 오류:', error);
    return res.status(500).json({
      error: '서버 내부 오류가 발생했습니다.',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}