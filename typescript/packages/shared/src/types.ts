/** 공공데이터 포털 공통 응답 헤더 */
export interface DataGoKrHeader {
  resultCode: string;
  resultMsg: string;
}

/** 공공데이터 포털 공통 응답 본문 */
export interface DataGoKrBody<T> {
  items: T[] | { item: T[] } | "";
  pageNo: number;
  numOfRows: number;
  totalCount: number;
}

/** 공공데이터 포털 공통 응답 */
export interface DataGoKrResponse<T> {
  response: {
    header: DataGoKrHeader;
    body: DataGoKrBody<T>;
  };
}

/**
 * 응답에서 items 배열을 추출합니다.
 * data.go.kr API는 items가 배열이거나 { item: [...] } 객체이거나 빈 문자열일 수 있습니다.
 */
export function extractItems<T>(body: DataGoKrBody<T>): T[] {
  const { items } = body;

  if (!items) {
    return [];
  }

  if (Array.isArray(items)) {
    return items;
  }

  if (typeof items === "object" && "item" in items) {
    const item = items.item;
    return Array.isArray(item) ? item : [item];
  }

  return [];
}
