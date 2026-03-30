# data-go-kr-mcp

공공데이터 포털(data.go.kr) OpenAPI를 MCP(Model Context Protocol) 서버로 제공하는 모노레포입니다.

이 저장소는 공공데이터 API를 MCP 서버로 래핑하는 공통 구조를 정리하고, 이를 **TypeScript**와 **Python** 두 가지 언어로 구현할 수 있도록 구성되어 있습니다.
현재는 `air-quality`, `weather-forecast` 서버가 예시로 포함되어 있으며, 같은 구조를 따라 다른 공공데이터포털 API도 쉽게 확장할 수 있습니다.

## 주요 특징

- 공공데이터포털 OpenAPI를 MCP 서버 형태로 제공
- TypeScript / Python 이중 구현
- API별 서버를 독립적으로 추가할 수 있는 모노레포 구조
- 공통 클라이언트 및 유틸리티 분리
- Claude Desktop 등 MCP 클라이언트와 연동 가능
- 새 API 서버를 빠르게 추가할 수 있는 스캐폴딩 지원

## API 카탈로그

| API | 설명 | TypeScript | Python |
|-----|------|-----------|--------|
| [air-quality](typescript/packages/servers/air-quality/) | 한국환경공단 에어코리아 대기오염정보 | ✅ | ✅ |
| [weather-forecast](typescript/packages/servers/weather-forecast/) | 기상청 단기예보 | ✅ | ✅ |

## 사전 준비

1. [공공데이터 포털](https://www.data.go.kr)에서 회원가입
2. 사용할 API의 활용신청
3. 발급받은 **일반 인증키(Encoding)**를 `.env` 파일에 설정

```bash
cp .env.example .env
# .env 파일을 열어 DATA_GO_KR_SERVICE_KEY 값을 입력하세요
```

> **참고**: 서비스키에 `+`, `=` 등 특수문자가 포함되어 있으면 API 호출 시 문제가 발생할 수 있습니다. 이 경우 공공데이터포털에서 키를 재발급 받으세요.

## 프로젝트 구조

```
data-go-kr-mcp/
├── typescript/          # TypeScript MCP 서버들
│   ├── packages/
│   │   ├── shared/      # 공통 유틸리티 (DataGoKrClient 등)
│   │   └── servers/     # API별 MCP 서버
│   │       ├── air-quality/
│   │       └── weather-forecast/
├── python/              # Python MCP 서버들
│   ├── shared/          # 공통 유틸리티
│   └── servers/         # API별 MCP 서버
│       ├── air-quality/
│       └── weather-forecast/
├── templates/           # CLI 스캐폴딩용 템플릿
├── scripts/             # 자동화 스크립트
└── docs/                # 문서
```

## 빠른 시작

### TypeScript

```bash
cd typescript
npm install
npm run build

# 대기오염정보 서버 실행
cd packages/servers/air-quality
cp ../../../../.env.example .env
# .env에 서비스키(DATA_GO_KR_SERVICE_KEY) 입력
npx tsx src/index.ts
```
빌드 결과물을 사용하는 경우에는 dist/index.js를 직접 실행할 수 있습니다.

### Python

```bash
# 대기오염정보 서버 실행
cd python/servers/air-quality
pip install -e .
cp ../../../.env.example .env
# .env에 서비스키(DATA_GO_KR_SERVICE_KEY) 입력
python -m src.server
```

## Claude Desktop 설정

`claude_desktop_config.json`에 서버를 추가하세요. 자세한 설정 방법은 [Claude Desktop 설정 가이드](docs/CLAUDE_DESKTOP_CONFIG.md)를 참고하세요.

## 테스트

### 스모크 테스트 (API 키 불필요)

서버 기동 및 도구 등록을 검증합니다:

```bash
node scripts/smoke-test.mjs --server air-quality --lang both
```

### 도구 호출 테스트 (API 키 필요)

실제 API를 호출하여 응답을 검증합니다:

```bash
node scripts/call-test.mjs --server air-quality --lang typescript
```

## 새 API 추가

이 저장소는 새로운 공공데이터 API를 쉽게 확장할 수 있도록 설계되었습니다.  
추가 절차는 [API 추가 가이드](docs/ADDING_API.md)를 참고하세요.

### CLI 스캐폴딩

```bash
node scripts/create-server.mjs --name my-api --lang typescript
```

## 문서

- [Claude Desktop 설정 가이드](docs/CLAUDE_DESKTOP_CONFIG.md)
- [새 API 추가 가이드](docs/ADDING_API.md)

## 라이선스

[MIT](LICENSE)
