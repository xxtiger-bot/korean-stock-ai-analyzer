export type MarketImpactNewsItem = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  newsUrl?: string;
  searchQuery?: string;
  category: "반도체" | "인터넷" | "자동차" | "바이오" | "시장";
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  affectedStocks: {
    symbol: string;
    stockName: string;
    impact: "positive" | "neutral" | "negative";
    reason: string;
  }[];
  tags: string[];
};

const MOCK_MARKET_IMPACT_NEWS: MarketImpactNewsItem[] = [
  {
    id: "market-news-1",
    title: "AI 서버 투자 확대 기대가 반도체 업종 심리에 우호적으로 작용",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-14 08:20 KST",
    searchQuery: "반도체 AI 서버 투자 확대 삼성전자 SK하이닉스",
    category: "반도체",
    sentiment: "positive",
    summary:
      "AI 서버와 메모리 수요 기대가 이어지면 대형 반도체 종목에 대한 투자 심리가 단기적으로 개선될 수 있습니다.",
    affectedStocks: [
      {
        symbol: "005930",
        stockName: "삼성전자",
        impact: "positive",
        reason: "메모리 수요 개선 기대가 실적 추정치에 긍정적으로 반영될 수 있습니다."
      },
      {
        symbol: "000660",
        stockName: "SK하이닉스",
        impact: "positive",
        reason: "HBM 수요 기대가 유지되면 수익성 기대가 강화될 수 있습니다."
      }
    ],
    tags: ["AI 서버", "메모리", "HBM"]
  },
  {
    id: "market-news-2",
    title: "국내 플랫폼·AI 서비스 경쟁 심화, 인터넷 업종은 선택적 반응 예상",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-14 07:55 KST",
    searchQuery: "인터넷 AI 서비스 경쟁 NAVER 카카오",
    category: "인터넷",
    sentiment: "neutral",
    summary:
      "AI 기능 확대와 광고·커머스 경쟁이 동시에 이어지면서, 인터넷 플랫폼 종목은 기대와 비용 부담이 함께 반영될 수 있습니다.",
    affectedStocks: [
      {
        symbol: "035420",
        stockName: "NAVER",
        impact: "positive",
        reason: "검색·커머스 결합 전략이 재평가되면 플랫폼 가치에 긍정적일 수 있습니다."
      },
      {
        symbol: "035720",
        stockName: "카카오",
        impact: "neutral",
        reason: "신규 서비스 기대는 있으나 수익화 속도 확인이 더 필요합니다."
      }
    ],
    tags: ["플랫폼", "AI 서비스", "광고"]
  },
  {
    id: "market-news-3",
    title: "환율 변동성 확대 가능성, 자동차 업종은 수출 기대와 비용 부담이 혼재",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-14 07:30 KST",
    searchQuery: "환율 변동성 자동차 업종 현대차 기아",
    category: "자동차",
    sentiment: "neutral",
    summary:
      "환율 변화는 수출 기업에 우호적일 수 있지만 원자재·부품 비용 부담과 함께 해석될 수 있어 종목별 구분이 필요합니다.",
    affectedStocks: [
      {
        symbol: "005380",
        stockName: "현대차",
        impact: "positive",
        reason: "원화 약세 구간에서는 수출 채산성 기대가 부각될 수 있습니다."
      },
      {
        symbol: "000270",
        stockName: "기아",
        impact: "neutral",
        reason: "판매 호조 기대와 비용 변동성이 함께 반영될 수 있습니다."
      }
    ],
    tags: ["환율", "자동차", "수출"]
  },
  {
    id: "market-news-4",
    title: "바이오 규제·임상 일정 이슈가 개별 종목 변동성에 영향 가능",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-13 18:10 KST",
    searchQuery: "바이오 규제 임상 일정 셀트리온헬스케어",
    category: "바이오",
    sentiment: "negative",
    summary:
      "바이오 업종은 임상 일정과 정책 해석에 따라 단기 변동성이 커질 수 있어 확인이 필요한 구간입니다.",
    affectedStocks: [
      {
        symbol: "068270",
        stockName: "셀트리온헬스케어",
        impact: "negative",
        reason: "규제·일정 관련 불확실성이 커지면 단기 심리에 부담이 될 수 있습니다."
      }
    ],
    tags: ["바이오", "임상", "변동성"]
  },
  {
    id: "market-news-5",
    title: "금리·환율 변수 재부각, KOSPI 대형주 전반은 방어적 해석 우세",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-14 06:50 KST",
    searchQuery: "금리 환율 KOSPI 대형주 삼성전자 KB금융",
    category: "시장",
    sentiment: "neutral",
    summary:
      "금리와 환율 변수는 지수 전반의 위험 선호를 흔들 수 있어, 대형주도 종목별 대응보다 포지션 관리가 먼저일 수 있습니다.",
    affectedStocks: [
      {
        symbol: "005930",
        stockName: "삼성전자",
        impact: "neutral",
        reason: "대형주 대표 종목으로 시장 전체 위험 선호 변화의 영향을 함께 받을 수 있습니다."
      },
      {
        symbol: "105560",
        stockName: "KB금융",
        impact: "neutral",
        reason: "금리와 환율 변수는 금융 대형주의 변동성에도 영향을 줄 수 있습니다."
      }
    ],
    tags: ["금리", "환율", "KOSPI"]
  }
];

export function getMockMarketImpactNews() {
  return MOCK_MARKET_IMPACT_NEWS;
}
