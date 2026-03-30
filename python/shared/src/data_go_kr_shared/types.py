from __future__ import annotations

from typing import Any, TypedDict


class DataGoKrHeader(TypedDict):
    resultCode: str
    resultMsg: str


class DataGoKrBody(TypedDict):
    items: list[Any] | dict[str, Any] | str
    pageNo: int
    numOfRows: int
    totalCount: int


class DataGoKrResponse(TypedDict):
    response: dict[str, Any]


def extract_items(body: dict[str, Any]) -> list[dict[str, Any]]:
    """응답에서 items 배열을 추출합니다.

    data.go.kr API는 items가 배열이거나 { item: [...] } 객체이거나
    빈 문자열일 수 있습니다.
    """
    items = body.get("items", "")

    if not items:
        return []

    if isinstance(items, list):
        return items

    if isinstance(items, dict) and "item" in items:
        item = items["item"]
        return item if isinstance(item, list) else [item]

    return []
