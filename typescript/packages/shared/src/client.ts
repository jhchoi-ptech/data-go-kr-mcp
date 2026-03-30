import { config } from "dotenv";
import { DataGoKrError, getGatewayErrorMessage } from "./errors.js";
import type { DataGoKrResponse } from "./types.js";

config();

// 기관 에러코드 범위
const INSTT_ERROR_MIN = 1;
const INSTT_ERROR_MAX = 99;

/** DataGoKrClient 생성 옵션 */
export interface DataGoKrClientOptions {
  /** API 베이스 URL */
  baseUrl: string;
  /** 서비스키 (기본값: 환경변수 DATA_GO_KR_SERVICE_KEY) */
  serviceKey?: string;
}

/**
 * 공공데이터 포털 API 클라이언트 베이스 클래스.
 *
 * - serviceKey를 query parameter로 그대로 전달 (인코딩/디코딩 없음)
 * - returnType/dataType 등은 API 스펙에 있으면 호출 시 params로 전달
 * - 에러 응답 구분: GW 에러(텍스트) / 엔드포인트 XML 에러 / 엔드포인트 JSON 에러
 */
export class DataGoKrClient {
  protected readonly baseUrl: string;
  protected readonly serviceKey: string;

  constructor(options: DataGoKrClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.serviceKey = options.serviceKey ?? process.env.DATA_GO_KR_SERVICE_KEY ?? "";

    if (!this.serviceKey) {
      throw new DataGoKrError(
        "NO_SERVICE_KEY",
        "서비스키가 설정되지 않았습니다. .env 파일에 DATA_GO_KR_SERVICE_KEY를 설정하세요.",
      );
    }
  }

  /**
   * API를 호출하고 JSON 응답을 반환합니다.
   */
  protected async fetch<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<DataGoKrResponse<T>> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);

    url.searchParams.set("serviceKey", this.serviceKey);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await globalThis.fetch(url.toString());
    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    const isSuccess = response.ok;

    // 1) GW 에러
    // - HTTP non-2xx + text/plain
    if (!isSuccess && contentType.toLowerCase().includes("text/plain")) {
      const gwBody = text.trim() || `API 게이트웨이 오류 (HTTP ${response.status})`;
      throw new DataGoKrError("GATEWAY_ERROR", getGatewayErrorMessage(gwBody));
    }

    // 2) XML 응답
    // - HTTP 2xx + resultCode 01~99: 기관 엔드포인트 에러 → 항상 에러로 처리
    // - 그 외 HTTP 2xx: 정상 응답으로 처리
    if (text.trimStart().startsWith("<")) {
      return this.handleXmlResponse<T>(text, isSuccess, response.status);
    }

    // 3) JSON 응답
    let dataRaw: unknown;
    try {
      dataRaw = JSON.parse(text);
    } catch {
      throw new DataGoKrError(
        "PARSE_ERROR",
        `응답을 JSON으로 파싱할 수 없습니다: ${text.substring(0, 200)}`,
      );
    }

    const data = dataRaw as DataGoKrResponse<T>;
    return this.handleJsonResponse<T>(data, isSuccess, response.status);
  }

  /** XML 응답을 기관 에러코드와 HTTP 상태에 따라 해석합니다. */
  private handleXmlResponse<T>(
    xml: string,
    isSuccess: boolean,
    status: number,
  ): DataGoKrResponse<T> {
    const insttError = this.parseXmlInstitutionError(xml);
    const code = (insttError.resultCode ?? "").trim();

    // HTTP가 2xx가 아니면 무조건 에러
    if (!isSuccess) {
      throw new DataGoKrError(`HTTP_${status}`, insttError.resultMsg);
    }

    // HTTP 2xx + 기관 에러코드(01~99)는 에러로 처리
    if (code && this.isInsttErrorResultCode(code)) {
      throw new DataGoKrError(code, insttError.resultMsg);
    }

    // 그 외 HTTP 2xx는 정상 응답으로, XML 헤더만 최소 구조로 변환
    const header = this.parseXmlHeader(xml);
    return this.xmlToMinimalResponse<T>(header);
  }

  /** JSON 응답을 기관 에러코드와 HTTP 상태에 따라 해석합니다. */
  private handleJsonResponse<T>(
    data: DataGoKrResponse<T>,
    isSuccess: boolean,
    status: number,
  ): DataGoKrResponse<T> {
    const header = data.response?.header ?? ({} as any);
    const rawCode = header.resultCode as string | undefined;
    const code = rawCode ? String(rawCode).trim() : "";

    if (isSuccess) {
      // HTTP 2xx + 기관 에러코드(01~99)만 에러로 처리
      if (code && this.isInsttErrorResultCode(code)) {
        const resultMsg =
          (header.resultMsg as string | undefined) ?? `알 수 없는 에러입니다. (코드: ${code})`;
        throw new DataGoKrError(code, resultMsg);
      }
      // 이외에는 정상 응답
      return data;
    }

    // HTTP 2xx가 아닌 경우: resultCode가 있으면 우선 사용, 없으면 HTTP 기반 에러로 처리
    if (code) {
      const resultMsg =
        (header.resultMsg as string | undefined) ??
        `알 수 없는 에러입니다. (코드: ${code})`;
      throw new DataGoKrError(code, resultMsg);
    }

    throw new DataGoKrError("HTTP_ERROR", `HTTP 오류 (상태 코드: ${status})`);
  }

  /** 기관 에러코드(01~99)인지 여부 */
  private isInsttErrorResultCode(code: string): boolean {
    const c = (code ?? "").trim();
    if (!/^\d+$/.test(c)) {
      return false;
    }
    const n = Number(c);
    return n >= INSTT_ERROR_MIN && n <= INSTT_ERROR_MAX;
  }

  /** XML 정상 응답을 DataGoKrResponse 최소 구조로 변환합니다. (XML 본문은 파싱하지 않음) */
  private xmlToMinimalResponse<T>(
    header: { resultCode: string; resultMsg: string },
  ): DataGoKrResponse<T> {
    return {
      response: {
        header: { resultCode: header.resultCode, resultMsg: header.resultMsg },
        body: { items: [], pageNo: 1, numOfRows: 10, totalCount: 0 },
      },
    };
  }

  /** XML 에러 응답에서 기관 에러코드와 메시지를 추출합니다. */
  private parseXmlInstitutionError(xml: string): { resultCode: string; resultMsg: string;} {
    const codeMatch = xml.match(/<returnReasonCode>\s*(\d+)\s*<\/returnReasonCode>/);
    const msgMatch = xml.match(/<returnAuthMsg>([^<]*)<\/returnAuthMsg>/);

    return {
      resultCode: codeMatch?.[1] ?? "UNKNOWN",
      resultMsg: msgMatch?.[1] ?? "알 수 없는 에러가 발생했습니다.",
    };
  }

  /** XML 정상 응답 헤더에서 resultCode와 resultMsg를 추출합니다. */
  private parseXmlHeader(xml: string): { resultCode: string; resultMsg: string } {
    const codeMatch = xml.match(/<resultCode>\s*([^<]+)\s*<\/resultCode>/);
    const msgMatch = xml.match(/<resultMsg>([^<]*)<\/resultMsg>/);

    return {
      resultCode: codeMatch?.[1]?.trim() ?? "UNKNOWN",
      resultMsg: msgMatch?.[1]?.trim() ?? "알 수 없는 에러가 발생했습니다.",
    };
  }
}
