"""한국환경공단 에어코리아 대기오염정보 MCP 서버."""

import json
import sys
from pathlib import Path

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# .env 파일 로드 (서버 디렉토리 → 루트 순서)
load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "shared" / "src"))
from data_go_kr_shared import DataGoKrClient, DataGoKrError, extract_items

BASE_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc"

mcp = FastMCP("data-go-kr-air-quality")
client = DataGoKrClient(base_url=BASE_URL)


@mcp.tool()
async def get_realtime_air_quality(
    station_name: str,
    data_term: str = "DAILY",
    page_no: int = 1,
    num_of_rows: int = 10,
) -> str:
    """측정소별 실시간 대기오염 측정 정보를 조회합니다.

    특정 측정소의 미세먼지, 초미세먼지, 오존, 일산화탄소 등의 수치를 확인할 수 있습니다.

    Args:
        station_name: 측정소 이름 (예: 종로구, 강남구, 서초구)
        data_term: 조회 기간 (DAILY: 1일, MONTH: 1개월, 3MONTH: 3개월)
        page_no: 페이지 번호 (기본값: 1)
        num_of_rows: 한 페이지 결과 수 (기본값: 10)
    """
    try:
        response = await client.fetch("getMsrstnAcctoRltmMesureDnsty", {
            "stationName": station_name,
            "dataTerm": data_term,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
            "ver": "1.5",
        })
        items = extract_items(response["response"]["body"])
        return json.dumps(items, ensure_ascii=False, indent=2)
    except DataGoKrError as e:
        return f"에러: {e}"


@mcp.tool()
async def get_air_quality_by_region(
    sido_name: str,
    page_no: int = 1,
    num_of_rows: int = 100,
) -> str:
    """시도별 실시간 대기오염 측정 정보를 조회합니다.

    특정 시도의 모든 측정소 데이터를 확인할 수 있습니다.

    Args:
        sido_name: 시도 이름 (예: 서울, 부산, 대구, 인천, 광주, 대전, 울산, 경기, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주, 세종)
        page_no: 페이지 번호 (기본값: 1)
        num_of_rows: 한 페이지 결과 수 (기본값: 100)
    """
    try:
        response = await client.fetch("getCtprvnRltmMesureDnsty", {
            "sidoName": sido_name,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
            "ver": "1.5",
        })
        items = extract_items(response["response"]["body"])
        return json.dumps(items, ensure_ascii=False, indent=2)
    except DataGoKrError as e:
        return f"에러: {e}"


@mcp.tool()
async def get_air_quality_forecast(
    search_date: str | None = None,
    inform_code: str | None = None,
    page_no: int = 1,
    num_of_rows: int = 10,
) -> str:
    """대기질 예보통보를 조회합니다.

    미세먼지(PM10), 초미세먼지(PM2.5), 오존(O3) 예보 정보를 확인할 수 있습니다.

    Args:
        search_date: 조회 날짜 (YYYY-MM-DD 형식, 기본값: 오늘)
        inform_code: 통보 코드 (PM10: 미세먼지, PM25: 초미세먼지, O3: 오존)
        page_no: 페이지 번호 (기본값: 1)
        num_of_rows: 한 페이지 결과 수 (기본값: 10)
    """
    try:
        params: dict = {
            "pageNo": page_no,
            "numOfRows": num_of_rows,
        }
        if search_date:
            params["searchDate"] = search_date
        if inform_code:
            params["InformCode"] = inform_code

        response = await client.fetch("getMinuDustFrcstDspth", params)
        items = extract_items(response["response"]["body"])
        return json.dumps(items, ensure_ascii=False, indent=2)
    except DataGoKrError as e:
        return f"에러: {e}"


def main():
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
