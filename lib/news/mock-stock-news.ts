export type MockStockNewsItem = {
  id: string;
  symbol: string;
  stockName: string;
  title: string;
  source: string;
  publishedAt: string;
  url?: string;
  sentiment: "positive" | "neutral" | "negative";
  impactSummary: string;
  relatedTags: string[];
};

const MOCK_STOCK_NEWS: MockStockNewsItem[] = [
  {
    id: "005930-1",
    symbol: "005930",
    stockName: "삼성전자",
    title: "삼성전자, 반도체 수요 회복 기대에 투자 심리 개선",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-11 08:40 KST",
    sentiment: "positive",
    impactSummary: "반도체 업황 개선 기대가 이어질 경우 단기 투자 심리에 긍정적으로 작용할 수 있습니다.",
    relatedTags: ["반도체", "메모리", "업황 회복"]
  },
  {
    id: "005930-2",
    symbol: "005930",
    stockName: "삼성전자",
    title: "외국인 수급 변동성 확대 가능성 주목",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-11 07:55 KST",
    sentiment: "neutral",
    impactSummary: "외국인 수급 변화가 커질 경우 가격 방향보다 변동성 확대 여부를 함께 볼 필요가 있습니다.",
    relatedTags: ["외국인 수급", "변동성", "체크 포인트"]
  },
  {
    id: "005930-3",
    symbol: "005930",
    stockName: "삼성전자",
    title: "실적 시즌 앞두고 보수적 관망 의견도 병행",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-10 18:20 KST",
    sentiment: "negative",
    impactSummary: "실적 확인 전까지는 단기 기대감과 함께 보수적 시각이 병행될 수 있습니다.",
    relatedTags: ["실적 시즌", "관망", "리스크 관리"]
  },
  {
    id: "000660-1",
    symbol: "000660",
    stockName: "SK하이닉스",
    title: "AI 메모리 수요 기대가 SK하이닉스 심리에 우호적",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-11 08:15 KST",
    sentiment: "positive",
    impactSummary: "AI 서버향 메모리 수요 기대가 유지되면 중기 투자 심리에 우호적으로 해석될 수 있습니다.",
    relatedTags: ["AI 메모리", "HBM", "수요 기대"]
  },
  {
    id: "000660-2",
    symbol: "000660",
    stockName: "SK하이닉스",
    title: "단기 급등 이후 변동성 관리 필요",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-11 07:20 KST",
    sentiment: "neutral",
    impactSummary: "가격 수준이 높아진 구간에서는 추세 확인과 함께 변동성 관리가 중요할 수 있습니다.",
    relatedTags: ["급등 구간", "변동성", "관망"]
  },
  {
    id: "000660-3",
    symbol: "000660",
    stockName: "SK하이닉스",
    title: "메모리 가격 기대와 밸류에이션 부담이 혼재",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-10 17:50 KST",
    sentiment: "negative",
    impactSummary: "업황 기대가 있어도 높은 밸류에이션 구간에서는 단기 조정 가능성을 함께 살펴야 합니다.",
    relatedTags: ["밸류에이션", "조정 가능성", "리스크"]
  },
  {
    id: "035420-1",
    symbol: "035420",
    stockName: "NAVER",
    title: "플랫폼 수익성 개선 기대가 NAVER 주가에 긍정적",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-11 09:05 KST",
    sentiment: "positive",
    impactSummary: "광고와 커머스 수익성 개선 기대가 이어질 경우 투자 심리에 긍정적입니다.",
    relatedTags: ["플랫폼", "광고", "커머스"]
  },
  {
    id: "035420-2",
    symbol: "035420",
    stockName: "NAVER",
    title: "신규 서비스 확장 속도는 추가 확인 필요",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-11 07:35 KST",
    sentiment: "neutral",
    impactSummary: "서비스 확장 기대는 있지만 실제 성과 반영 속도는 추가 확인이 필요합니다.",
    relatedTags: ["신규 서비스", "확장", "점검"]
  },
  {
    id: "035420-3",
    symbol: "035420",
    stockName: "NAVER",
    title: "플랫폼 규제 이슈는 단기 심리에 부담 요인",
    source: "KRX Insight Sample",
    publishedAt: "2026-06-10 19:10 KST",
    sentiment: "negative",
    impactSummary: "정책 또는 규제 이슈가 부각되면 단기적으로 보수적 해석이 필요할 수 있습니다.",
    relatedTags: ["규제", "정책", "단기 부담"]
  }
];

export function getMockStockNews(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  return MOCK_STOCK_NEWS.filter((item) => item.symbol === normalized).slice(0, 3);
}
