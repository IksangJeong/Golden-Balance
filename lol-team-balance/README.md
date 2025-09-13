# 🎮 LOL 팀 밸런싱 시스템

리그 오브 레전드 팀 구성을 위한 지능형 밸런싱 시스템입니다.

## ✨ 주요 기능

### 🔥 실시간 API 연동
- **Riot Games API** 완전 통합
- **실시간 플레이어 데이터** 자동 수집
- **Riot ID 지원** (닉네임#태그 형식)
- **랭크 정보, 최근 경기 통계** 자동 분석

### ⚖️ 지능형 팀 밸런싱
- **다중 요소 분석**: 티어, 포지션, 성능 지표
- **실시간 밸런스 평가**: 황벨/맞벨/망벨 시스템
- **포지션별 최적화**: 역할군 고려한 팀 구성
- **드래그 앤 드롭**: 직관적인 팀 편성

### 🎯 사용자 친화적 UI
- **LOL 테마 디자인**: 공식 스타일 적용
- **반응형 레이아웃**: 모든 디바이스 지원
- **실시간 피드백**: 즉각적인 밸런스 표시

## 🚀 빠른 시작

### 1. 설치 및 실행
```bash
# 저장소 클론
git clone https://github.com/your-username/lol-team-balance.git
cd lol-team-balance

# 의존성 설치
npm install

# 개발 서버 시작
npm start
```

### 2. API 연동 (선택사항)
```bash
# .env.local 파일 생성
echo "RIOT_API_KEY=your_riot_api_key_here" > .env.local

# API 모드 활성화 (src/services/riotAPI.js)
USE_MOCK: false
```

### 3. 브라우저에서 확인
```
http://localhost:3000
```

## 📱 사용법

### 플레이어 추가
1. **수동 입력**: 기본 정보 직접 입력
2. **API 검색**: Riot ID로 실시간 데이터 가져오기

### 팀 구성
1. **자동 밸런싱**: "팀 짜기" 버튼으로 최적 구성
2. **수동 조정**: 드래그 앤 드롭으로 개별 배정
3. **실시간 분석**: 포지션별 밸런스 확인

### 데이터 관리
- **자동 저장**: localStorage에 플레이어 정보 보관
- **캐시 시스템**: API 데이터 24시간 캐시
- **데이터 내보내기**: JSON 형태로 백업 가능

## 🛠️ 기술 스택

### Frontend
- **React 19**: 최신 React with Hooks
- **JavaScript ES6+**: 모던 자바스크립트
- **CSS3**: 커스텀 LOL 테마
- **@dnd-kit**: 드래그 앤 드롭 구현

### Backend (Serverless)
- **Vercel Functions**: 서버리스 API
- **Riot Games API**: 공식 데이터 소스
- **CORS 지원**: 크로스 도메인 요청 처리

### Deployment
- **Vercel**: 자동 배포 및 호스팅
- **GitHub**: 소스 코드 관리
- **환경변수**: 보안 API 키 관리

## 📊 핵심 알고리즘

### 밸런싱 로직
```javascript
// 스킬 점수 = 티어 기반 점수 + 성능 보정
skillScore = tierLevel * 10 + performanceModifier

// 역할 점수 = 포지션 숙련도 + 경험치
roleScore = positionMastery * roleProficiency

// 팀 밸런스 = 전체 점수 차이 + 포지션 균형
teamBalance = calculateScoreDifference() + calculateRoleBalance()
```

### 평가 기준
- **황벨 (Golden)**: 5% 이내 점수 차이
- **맞벨 (Fair)**: 10% 이내 점수 차이
- **망벨 (Poor)**: 10% 초과 점수 차이

## 🌟 고급 기능

### API 통합 기능
- ✅ **실시간 랭크 정보**
- ✅ **최근 경기 통계**
- ✅ **포지션 분석**
- ✅ **성능 지표 계산**
- 🔄 **매치 히스토리 분석** (구현 예정)
- 🔄 **챔피언 숙련도** (구현 예정)

### 분석 도구
- **밸런스 시뮬레이션**: 다양한 조합 테스트
- **통계 대시보드**: 팀 성과 분석
- **예측 모델**: 승률 예측 시스템

## 📈 성능 최적화

### 캐싱 전략
- **메모리 캐시**: 세션 내 빠른 접근
- **localStorage**: 브라우저 재시작 시 유지
- **API 캐시**: 24시간 데이터 보존

### 최적화 기법
- **레이지 로딩**: 필요시에만 데이터 로드
- **배치 처리**: 여러 API 요청 통합
- **에러 핸들링**: 사용자 친화적 오류 처리

## 🔒 보안 및 안정성

### API 보안
- **환경변수**: API 키 안전 보관
- **CORS 설정**: 도메인 기반 접근 제어
- **Rate Limiting**: API 남용 방지

### 데이터 보호
- **클라이언트 사이드**: 민감 정보 비저장
- **캐시 만료**: 자동 데이터 갱신
- **에러 로깅**: 개발 모드에서만 상세 로그

## 🚀 배포 가이드

### Vercel 배포 (추천)
1. **GitHub 연결**: 저장소 연결
2. **환경변수**: `RIOT_API_KEY` 설정
3. **자동 배포**: Push 시 자동 업데이트

### 대안 플랫폼
- **Netlify**: JAMstack 호스팅
- **GitHub Pages**: 정적 사이트 (API 제한)
- **Heroku**: 풀스택 배포

자세한 배포 방법은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

## 🤝 기여하기

### 개발 참여
```bash
# 포크 및 클론
git clone https://github.com/your-username/lol-team-balance.git

# 브랜치 생성
git checkout -b feature/new-feature

# 변경사항 커밋
git commit -m "Add new feature"

# 풀 리퀘스트 생성
git push origin feature/new-feature
```

### 버그 리포트
- **GitHub Issues** 활용
- **재현 가능한 단계** 포함
- **환경 정보** 명시

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🙏 크레딧

- **Riot Games**: API 및 게임 데이터 제공
- **React Team**: 프레임워크 제공
- **Vercel**: 호스팅 플랫폼 제공
- **@dnd-kit**: 드래그 앤 드롭 라이브러리

---

⭐ **이 프로젝트가 도움이 되었다면 스타를 눌러주세요!** ⭐