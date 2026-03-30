# @data-go-kr/weather-forecast

기상청 단기예보 MCP 서버

[공공데이터포털 API 상세](https://www.data.go.kr/data/15084084/openapi.do)

> **참고:** 이 API는 위경도 좌표가 아닌 격자 좌표(nx, ny)를 사용합니다. 위경도를 격자 좌표로 변환해야 합니다. 격자 좌표 변환표는 기상청에서 제공하는 엑셀 파일을 참고하세요.

## 제공 도구 (Tools)

| 도구 이름 | 설명 |
|-----------|------|
| `get_ultra_short_realtime` | 초단기실황 정보를 조회합니다. 현재 기온, 강수량, 습도, 풍속 등의 실시간 기상 관측 데이터를 확인할 수 있습니다. |
| `get_ultra_short_forecast` | 초단기예보 정보를 조회합니다. 향후 6시간 이내의 기상 예보 데이터를 확인할 수 있습니다. |
| `get_village_forecast` | 단기예보 정보를 조회합니다. 향후 3일간의 기상 예보 데이터(기온, 강수확률, 하늘상태 등)를 확인할 수 있습니다. |

## 기상 카테고리 참조

| 카테고리 | 설명 | 단위 | 사용 API |
|----------|------|------|----------|
| T1H | 기온 | C | 초단기실황/초단기예보 |
| RN1 | 1시간 강수량 | mm | 초단기실황/초단기예보 |
| UUU | 동서바람성분 | m/s | 초단기실황/초단기예보 |
| VVV | 남북바람성분 | m/s | 초단기실황/초단기예보 |
| REH | 습도 | % | 초단기실황/초단기예보 |
| PTY | 강수형태 | 코드 | 초단기실황/초단기예보/단기예보 |
| VEC | 풍향 | deg | 초단기실황/초단기예보 |
| WSD | 풍속 | m/s | 초단기실황/초단기예보 |
| SKY | 하늘상태 | 코드 | 초단기예보/단기예보 |
| TMN | 일 최저기온 | C | 단기예보 |
| TMX | 일 최고기온 | C | 단기예보 |
| POP | 강수확률 | % | 단기예보 |
| PCP | 1시간 강수량 | 범주 | 단기예보 |
| SNO | 1시간 신적설 | 범주 | 단기예보 |

### 강수형태(PTY) 코드

| 코드 | 의미 |
|------|------|
| 0 | 없음 |
| 1 | 비 |
| 2 | 비/눈 |
| 3 | 눈 |
| 5 | 빗방울 |
| 6 | 빗방울눈날림 |
| 7 | 눈날림 |

### 하늘상태(SKY) 코드

| 코드 | 의미 |
|------|------|
| 1 | 맑음 |
| 3 | 구름많음 |
| 4 | 흐림 |

## 환경 변수

`.env` 파일을 생성하고 [공공데이터포털](https://www.data.go.kr/)에서 발급받은 서비스키를 설정하세요.

```bash
cp .env.example .env
```

```
DATA_GO_KR_SERVICE_KEY=your_service_key_here
```

## 빌드 및 실행

```bash
# 빌드
npm run build

# 실행
npm run start

# 개발 모드
npm run dev
```

## Claude Desktop 설정

`claude_desktop_config.json`에 아래 내용을 추가하세요.

```json
{
  "mcpServers": {
    "weather-forecast": {
      "command": "node",
      "args": ["/absolute/path/to/typescript/packages/servers/weather-forecast/dist/index.js"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "your_service_key_here"
      }
    }
  }
}
```
