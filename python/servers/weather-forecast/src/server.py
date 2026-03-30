"""기상청 단기예보 MCP 서버."""

import json
import sys
from pathlib import Path

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "shared" / "src"))
from data_go_kr_shared import DataGoKrClient, DataGoKrError, extract_items

BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"

mcp = FastMCP("data-go-kr-weather-forecast")
client = DataGoKrClient(base_url=BASE_URL)


@mcp.tool()
async def get_ultra_short_realtime(
    base_date: str,
    base_time: str,
    nx: int,
    ny: int,
    page_no: int = 1,
    num_of_rows: int = 100,
) -> str:
    """초단기실황 정보를 조회합니다.

    현재 기온, 강수량, 습도, 풍속 등의 실시간 기상 관측 데이터를 확인할 수 있습니다.

    Args:
        base_date: 발표일자 (YYYYMMDD 형식)
        base_time: 발표시각 (HHMM 형식, 예: 0600)
        nx: 예보지점 X 좌표 (격자)
        ny: 예보지점 Y 좌표 (격자)
        page_no: 페이지 번호 (기본값: 1)
        num_of_rows: 한 페이지 결과 수 (기본값: 100)
    """
    try:
        response = await client.fetch("getUltraSrtNcst", {
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
        })
        items = extract_items(response["response"]["body"])
        return json.dumps(items, ensure_ascii=False, indent=2)
    except DataGoKrError as e:
        return f"에러: {e}"


@mcp.tool()
async def get_ultra_short_forecast(
    base_date: str,
    base_time: str,
    nx: int,
    ny: int,
    page_no: int = 1,
    num_of_rows: int = 1000,
) -> str:
    """초단기예보 정보를 조회합니다.

    향후 6시간 이내의 기상 예보 데이터를 확인할 수 있습니다.

    Args:
        base_date: 발표일자 (YYYYMMDD 형식)
        base_time: 발표시각 (HHMM 형식, 예: 0630)
        nx: 예보지점 X 좌표 (격자)
        ny: 예보지점 Y 좌표 (격자)
        page_no: 페이지 번호 (기본값: 1)
        num_of_rows: 한 페이지 결과 수 (기본값: 1000)
    """
    try:
        response = await client.fetch("getUltraSrtFcst", {
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
        })
        items = extract_items(response["response"]["body"])
        return json.dumps(items, ensure_ascii=False, indent=2)
    except DataGoKrError as e:
        return f"에러: {e}"


@mcp.tool()
async def get_village_forecast(
    base_date: str,
    base_time: str,
    nx: int,
    ny: int,
    page_no: int = 1,
    num_of_rows: int = 1000,
) -> str:
    """단기예보 정보를 조회합니다.

    향후 3일간의 기상 예보 데이터(기온, 강수확률, 하늘상태 등)를 확인할 수 있습니다.

    Args:
        base_date: 발표일자 (YYYYMMDD 형식)
        base_time: 발표시각 (HHMM 형식, 예: 0500, 주요 발표시각: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300)
        nx: 예보지점 X 좌표 (격자)
        ny: 예보지점 Y 좌표 (격자)
        page_no: 페이지 번호 (기본값: 1)
        num_of_rows: 한 페이지 결과 수 (기본값: 1000)
    """
    try:
        response = await client.fetch("getVilageFcst", {
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
        })
        items = extract_items(response["response"]["body"])
        return json.dumps(items, ensure_ascii=False, indent=2)
    except DataGoKrError as e:
        return f"에러: {e}"


def main():
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
