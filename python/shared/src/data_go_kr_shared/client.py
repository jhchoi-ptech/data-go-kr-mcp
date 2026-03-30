"""공공데이터 포털 API 클라이언트 베이스 클래스."""

from __future__ import annotations

import os
import re
import xml.etree.ElementTree as ET
from typing import Any

import httpx
from dotenv import load_dotenv

from .errors import DataGoKrError, get_gateway_error_message

load_dotenv()

# 기관 에러코드 범위
INSTT_ERROR_MIN = 1
INSTT_ERROR_MAX = 99


class DataGoKrClient:
    """공공데이터 포털 API 클라이언트 베이스 클래스.

    - serviceKey를 query parameter로 그대로 전달 (인코딩/디코딩 없음)
    - returnType/dataType 등은 API 스펙에 있으면 호출 시 params로 전달
    - 에러 응답 구분: GW 에러(텍스트) / 엔드포인트 에러 (XML/JSON)
    """

    def __init__(
        self,
        base_url: str,
        service_key: str | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.service_key = service_key or os.getenv("DATA_GO_KR_SERVICE_KEY", "")

        if not self.service_key:
            raise DataGoKrError(
                "NO_SERVICE_KEY",
                "서비스키가 설정되지 않았습니다. .env 파일에 DATA_GO_KR_SERVICE_KEY를 설정하세요.",
            )

        self._client = httpx.AsyncClient(timeout=30.0)

    async def fetch(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """API를 호출하고 JSON 응답을 반환합니다."""
        url = f"{self.base_url}/{endpoint}"

        query_params: dict[str, str] = {"serviceKey": self.service_key}

        if params:
            for key, value in params.items():
                if value is not None and value != "":
                    query_params[key] = str(value)

        response = await self._client.get(url, params=query_params)
        text = response.text
        content_type = response.headers.get("content-type", "")
        is_success = response.is_success

        # 1) GW 에러
        # - HTTP non-2xx + text/plain
        if not is_success and "text/plain" in content_type.lower():
            gw_body = text.strip() or f"API 게이트웨이 오류 (HTTP {response.status_code})"
            raise DataGoKrError("GATEWAY_ERROR", get_gateway_error_message(gw_body))

        # 2) XML 응답
        # - HTTP 2xx + resultCode 01~99: 기관 엔드포인트 에러 → 항상 에러로 처리
        # - 그 외 HTTP 2xx: 정상 응답으로 처리
        if text.lstrip().startswith("<"):
            return self._handle_xml_response(text, is_success, response.status_code)

        # 3) JSON 응답
        try:
            data = response.json()
        except Exception:
            raise DataGoKrError(
                "PARSE_ERROR",
                f"응답을 JSON으로 파싱할 수 없습니다: {text[:200]}",
            )

        return self._handle_json_response(data, is_success, response.status_code)

    def _handle_xml_response(self, xml: str, is_success: bool, status_code: int) -> dict[str, Any]:
        """XML 응답을 기관 에러코드와 HTTP 상태에 따라 해석합니다."""
        parsed = self._parse_xml_error(xml)
        code = (parsed["result_code"] or "").strip()

        # HTTP가 2xx가 아니면 에러
        if not is_success:
            raise DataGoKrError(f"HTTP_{status_code}", parsed["result_msg"])

        # HTTP 2xx + 기관 에러코드(01~99)만 에러로 처리
        if self._is_instt_error_result_code(code):
            raise DataGoKrError(code, parsed["result_msg"])

        return self._parse_xml_response(xml)

    def _handle_json_response(self, data: dict[str, Any], is_success: bool, status_code: int) -> dict[str, Any]:
        """JSON 응답을 기관 에러코드와 HTTP 상태에 따라 해석합니다."""
        header = data.get("response", {}).get("header") or {}
        raw_code = header.get("resultCode")
        code = str(raw_code).strip() if raw_code is not None else ""

        if is_success:
            # HTTP 2xx + 기관 에러코드(01~99)만 에러로 처리
            if code and self._is_instt_error_result_code(code):
                result_msg = header.get("resultMsg") or f"알 수 없는 에러입니다. (코드: {code})"
                raise DataGoKrError(code, result_msg)
            # 그 외는 정상 처리
            return data

        # HTTP 2xx가 아닌 경우: resultCode가 있으면 우선 사용, 없으면 HTTP 기반 에러로 처리
        if code:
            result_msg = header.get("resultMsg") or f"알 수 없는 에러입니다. (코드: {code})"
            raise DataGoKrError(code, result_msg)

        raise DataGoKrError("HTTP_ERROR", f"HTTP 오류 (상태 코드: {status_code})")

    def _is_instt_error_result_code(self, code: str) -> bool:
        """기관 엔드포인트에서 사용하는 에러 코드(01~99)인지 여부."""
        c = (code or "").strip()
        if not c.isdigit():
            return False
        try:
            n = int(c)
        except ValueError:
            return False
        return INSTT_ERROR_MIN <= n <= INSTT_ERROR_MAX

    def _parse_xml_response(self, xml: str) -> dict[str, Any]:
        """XML 정상 응답 전체를 JSON과 동일한 구조(response.header, response.body)로 파싱합니다."""
        try:
            root = ET.fromstring(xml)
        except ET.ParseError:
            parsed = self._parse_xml_error(xml)
            return {
                "response": {
                    "header": {"resultCode": parsed["result_code"], "resultMsg": parsed["result_msg"]},
                    "body": {"items": [], "pageNo": 1, "numOfRows": 10, "totalCount": 0},
                }
            }

        def tag(el: ET.Element) -> str:
            t = el.tag
            return t.split("}")[-1] if "}" in t else t

        def el_to_value(el: ET.Element) -> Any:
            if len(el) == 0:
                return (el.text or "").strip()
            return {tag(c): el_to_value(c) for c in el}

        header_el = root.find("header")
        header: dict[str, str] = {}
        if header_el is not None:
            for c in header_el:
                header[tag(c)] = (c.text or "").strip()

        body_el = root.find("body")
        body: dict[str, Any] = {"items": [], "pageNo": 1, "numOfRows": 10, "totalCount": 0}
        if body_el is not None:
            items_el = body_el.find("items")
            if items_el is not None:
                item_els = items_el.findall("item")
                body["items"] = [{tag(c): el_to_value(c) for c in item} for item in item_els]
            for key in ("pageNo", "numOfRows", "totalCount"):
                node = body_el.find(key)
                if node is not None and node.text:
                    try:
                        body[key] = int(node.text.strip())
                    except ValueError:
                        body[key] = node.text.strip()

        return {"response": {"header": header, "body": body}}

    def _parse_xml_error(self, xml: str) -> dict[str, str]:
        """XML 에러 응답에서 resultCode와 resultMsg를 추출합니다."""
        code_match = re.search(r"<returnReasonCode>\s*(\d+)\s*</returnReasonCode>", xml)
        msg_match = re.search(r"<returnAuthMsg>([^<]*)</returnAuthMsg>", xml)

        return {
            "result_code": code_match.group(1) if code_match else "UNKNOWN",
            "result_msg": msg_match.group(1) if msg_match else "알 수 없는 에러가 발생했습니다.",
        }

    async def close(self) -> None:
        """HTTP 클라이언트를 닫습니다."""
        await self._client.aclose()
