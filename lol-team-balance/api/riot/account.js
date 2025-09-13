// Vercel Function: Riot Account API 프록시
// 경로: /api/riot/account?gameName=닉네임&tagLine=태그

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
        example: '/api/riot/account?gameName=닉네임&tagLine=KR1'
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

    // Riot Account API 호출
    const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

    const accountResponse = await fetch(accountUrl, {
      headers: {
        'X-Riot-Token': riotApiKey,
        'User-Agent': 'LOL-Team-Balance/1.0.0'
      }
    });

    if (!accountResponse.ok) {
      // Riot API 에러 응답 처리
      if (accountResponse.status === 404) {
        return res.status(404).json({
          error: `플레이어를 찾을 수 없습니다: ${gameName}#${tagLine}`,
          code: 'PLAYER_NOT_FOUND'
        });
      } else if (accountResponse.status === 403) {
        return res.status(403).json({
          error: 'API 키가 유효하지 않습니다.',
          code: 'INVALID_API_KEY'
        });
      } else if (accountResponse.status === 429) {
        return res.status(429).json({
          error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      } else {
        return res.status(accountResponse.status).json({
          error: `Riot API 오류: ${accountResponse.status}`,
          code: 'RIOT_API_ERROR'
        });
      }
    }

    const accountData = await accountResponse.json();

    // 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        puuid: accountData.puuid,
        gameName: accountData.gameName,
        tagLine: accountData.tagLine,
        riotId: `${accountData.gameName}#${accountData.tagLine}`
      }
    });

  } catch (error) {
    console.error('Account API 프록시 오류:', error);
    return res.status(500).json({
      error: '서버 내부 오류가 발생했습니다.',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}