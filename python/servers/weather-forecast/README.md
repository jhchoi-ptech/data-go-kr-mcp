# 기상청 단기예보 MCP 서버

기상청 단기예보 조회서비스 API를 MCP(Model Context Protocol) 도구로 제공하는 서버입니다.

초단기실황, 초단기예보, 단기예보 데이터를 조회할 수 있습니다.

- **출처**: [공공데이터포털 - 기상청_단기예보 ((구)_동네예보) 조회서비스](https://www.data.go.kr/data/15084084/openapi.do)
- **Base URL**: `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0`

## 격자 좌표 안내

이 API는 위경도 대신 격자 좌표(nx, ny)를 사용합니다. 기상청 격자 좌표 변환이 필요합니다.

### 주요 도시 격자 좌표

| 도시 | nx | ny |
|------|----|----|
| 서울 | 60 | 127 |
| 부산 | 98 | 76 |
| 대구 | 89 | 90 |
| 인천 | 55 | 124 |
| 광주 | 58 | 74 |
| 대전 | 67 | 100 |
| 울산 | 102 | 84 |
| 제주 | 52 | 38 |

## 기상 자료 항목

| 항목코드 | 항목명 | 단위 | 설명 |
|----------|--------|------|------|
| T1H | 기온 | C | 현재 기온 |
| RN1 | 1시간 강수량 | mm | 1시간 동안의 강수량 |
| UUU | 동서바람성분 | m/s | 동서 방향 바람 성분 |
| VVV | 남북바람성분 | m/s | 남북 방향 바람 성분 |
| REH | 습도 | % | 상대 습도 |
| PTY | 강수형태 | 코드 | 0: 없음, 1: 비, 2: 비/눈, 3: 눈, 5: 빗방울, 6: 빗방울눈날림, 7: 눈날림 |
| VEC | 풍향 | deg | 바람이 불어오는 방향 (0~360) |
| WSD | 풍속 | m/s | 바람의 속도 |
| SKY | 하늘상태 | 코드 | 1: 맑음, 3: 구름많음, 4: 흐림 |
| TMN | 일 최저기온 | C | 하루 중 최저 기온 |
| TMX | 일 최고기온 | C | 하루 중 최고 기온 |
| POP | 강수확률 | % | 강수가 발생할 확률 |
| PCP | 1시간 강수량 | 범주 | 강수량 범주 (단기예보) |
| SNO | 1시간 신적설 | 범주 | 신적설 범주 (단기예보) |

## 제공 도구

| 도구명 | 설명 | API 엔드포인트 |
|--------|------|----------------|
| `get_ultra_short_realtime` | 초단기실황조회 | `getUltraSrtNcst` |
| `get_ultra_short_forecast` | 초단기예보조회 | `getUltraSrtFcst` |
| `get_village_forecast` | 단기예보조회 | `getVilageFcst` |

## 설치 및 실행

### 사전 준비

1. [공공데이터포털](https://www.data.go.kr/)에서 "기상청_단기예보 ((구)_동네예보) 조회서비스" API 활용 신청
2. 발급받은 서비스키를 `.env` 파일에 설정

```bash
cp .env.example .env
# .env 파일에 서비스키 입력
```

### 설치

```bash
cd python/servers/weather-forecast
uv sync
```

### 실행

```bash
uv run weather-forecast-server
```

## Claude Desktop 설정

`claude_desktop_config.json`에 아래 설정을 추가합니다:

```json
{
  "mcpServers": {
    "weather-forecast": {
      "command": "uv",
      "args": [
        "--directory",
        "/absolute/path/to/python/servers/weather-forecast",
        "run",
        "weather-forecast-server"
      ]
    }
  }
}
```
