# LOL 팀 밸런싱 시스템 배포 가이드

## 🚀 Vercel 배포 단계별 가이드

### 1단계: Riot API Key 발급
1. [Riot Developer Portal](https://developer.riotgames.com) 접속
2. 계정 로그인 또는 회원가입
3. "PERSONAL API KEY" 생성
4. API Key 복사 (24시간 유효, 개발용)

### 2단계: Vercel 계정 설정
1. [Vercel](https://vercel.com) 계정 생성 (GitHub 연동 추천)
2. GitHub 저장소와 연결

### 3단계: 프로젝트 배포
1. **GitHub에 프로젝트 푸시**
   ```bash
   git add .
   git commit -m "Add Riot API integration"
   git push origin main
   ```

2. **Vercel에서 프로젝트 임포트**
   - Vercel 대시보드에서 "New Project" 클릭
   - GitHub 저장소 선택
   - Framework Preset: "Create React App" 자동 감지
   - "Deploy" 클릭

3. **환경변수 설정**
   - 배포 완료 후 프로젝트 Settings → Environment Variables
   - 다음 변수 추가:
     ```
     RIOT_API_KEY = 복사한_API_키
     ```

### 4단계: 배포 확인
1. 배포된 URL 접속
2. "인원 추가" → "API에서 검색" 기능 테스트
3. 실제 Riot ID로 플레이어 검색 테스트

## 🔧 로컬 개발 환경 설정

### API 개발 모드
```bash
# .env.local 파일에 API Key 추가
RIOT_API_KEY=your_riot_api_key_here

# 개발 서버 시작
npm start
```

### 목업 모드로 전환 (API 키 없이 테스트)
```javascript
// src/services/riotAPI.js에서
USE_MOCK: true  // false에서 true로 변경
```

## 📝 API 엔드포인트

### 사용 가능한 API 경로
- `GET /api/riot/player?gameName=닉네임&tagLine=태그` - 통합 플레이어 정보
- `GET /api/riot/account?gameName=닉네임&tagLine=태그` - 계정 정보
- `GET /api/riot/summoner?puuid=플레이어_PUUID` - 소환사 정보
- `GET /api/riot/league?summonerId=소환사_ID` - 랭크 정보

### 예시 사용법
```javascript
// 플레이어 검색
const response = await fetch('/api/riot/player?gameName=Hide on bush&tagLine=KR1');
const data = await response.json();
```

## 🚨 주의사항

### API 제한사항
- **Personal API Key**: 초당 20회, 2분당 100회 요청 제한
- **Production API Key**: 별도 신청 필요 (무료, 더 높은 제한)

### 오류 처리
- 404: 플레이어를 찾을 수 없음
- 429: API 요청 한도 초과
- 403: API 키 오류

### 캐시 시스템
- 플레이어 데이터는 24시간 캐시됨
- localStorage와 메모리 이중 캐시
- 캐시 수동 초기화: `RiotAPI.cache.clear()`

## 🎯 추가 기능 구현 가능

### 고급 기능
1. **매치 히스토리 분석**: 최근 20경기 상세 분석
2. **챔피언 숙련도**: 주 챔피언 분석
3. **실시간 업데이트**: 주기적 데이터 갱신
4. **팀 추천 알고리즘**: AI 기반 팀 구성

### 확장 가능한 구조
- 멀티 리전 지원 (NA, EU, KR 등)
- 다른 게임 모드 지원 (ARAM, TFT 등)
- 상세 통계 대시보드
- 팀 성과 추적

## 💰 비용 정보

### 완전 무료 운영 가능
- **Vercel**: 개인 프로젝트 무료
- **Riot API**: 무료 (제한 있음)
- **Storage**: localStorage 사용 (무료)

### 유료 업그레이드 옵션
- **Vercel Pro**: $20/월 (팀 협업, 고급 기능)
- **Production API**: 무료이지만 신청 필요
- **데이터베이스**: Supabase, MongoDB Atlas 무료 플랜

## 🆘 문제 해결

### 자주 발생하는 오류
1. **CORS 오류**: Vercel Functions가 올바르게 설정되지 않음
2. **API Key 오류**: 환경변수 설정 확인
3. **빌드 실패**: 의존성 버전 충돌

### 연락처
- GitHub Issues 활용
- Riot API 문서: [developer.riotgames.com](https://developer.riotgames.com)
- Vercel 문서: [vercel.com/docs](https://vercel.com/docs)