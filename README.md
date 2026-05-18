# KRX Insight MVP

韩国股票分析 Web 软件 MVP。项目面向韩国股票用户，提供 data.go.kr 日별 종가数据、K 线、技术指标、AI 分析、自选股优先级和今日简报，帮助用户快速判断“今天先看什么、风险在哪里、需要观察哪些位置”。

> 本项目仅供信息展示和产品原型验证，不构成投资建议。

## 已完成功能

- 首页市场总览：真实 `data.go.kr` KOSPI / KOSDAQ 指数行情。
- 今日机会雷达：基于韩国代表股票池的真实日별 종가数据和 K 线计算触发信号。
- 热门股票：基于韩国代表股票池的真实日별 종가、成交量、成交额、波动率和数据完整度排序。
- 搜索：支持按韩国股票代码和韩文名称搜索，例如 `005930`、`삼성전자`。
- 股票详情页：真实最近收盘价、涨跌幅、成交量、市值、市场、数据来源。
- K 线图：真实 `data.go.kr` 日线数据。
- 技术指标：基于真实 K 线计算 MA5、MA20、MA60、RSI、MACD。
- AI 분석 리포트：基于真实日별 종가行情上下文生成趋势、技术面、风险和观察点。
- 진입 위험도：基于 RSI、MA20 偏离、成交量、短线涨幅、MACD 计算风险评分。
- 지표 해석：用普通用户能理解的韩文解释 RSI、MACD、MA5、MA20、MA60。
- 매매 계획 도우미：根据用户输入的买入价、持仓数量、周期计算参考观察位和盈亏。
- 관심종목：使用浏览器 `localStorage` 保存，支持添加、删除、刷新保留。
- 관심종목 우선순위：基于自选股真实日별 종가数据和技术指标排序。
- 오늘의 관심종목 리포트：生成韩文自选股日报。
- 暗色模式和移动端适配：桌面端和移动端均避免横向滚动。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts
- Supabase 客户端占位
- OpenAI API
- data.go.kr 真实韩国股票数据

## 环境变量

复制 `.env.local.example` 为 `.env.local`：

```bash
cp .env.local.example .env.local
```

本地真实数据模式示例：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STOCK_DATA_PROVIDER=real
KOREA_STOCK_API_SOURCE=data_go_kr
DATA_GO_KR_API_KEY=你的_data_go_kr_key
KRX_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

说明：

- `STOCK_DATA_PROVIDER=mock`：使用本地 mock 数据。
- `STOCK_DATA_PROVIDER=real`：优先使用真实 API，失败时自动 fallback 到 mock。
- `KOREA_STOCK_API_SOURCE=data_go_kr`：使用 data.go.kr 适配器。
- `KOREA_STOCK_API_SOURCE=krx`：保留 KRX 适配器骨架，当前仍 fallback。
- `DATA_GO_KR_API_KEY`：只在服务端读取，不会暴露到浏览器前端。
- `OPENAI_API_KEY`：存在时调用 OpenAI 生成报告；不存在时使用真实日별 종가行情上下文生成本地 fallback 报告。

`.env.local` 已在 `.gitignore` 中排除，不要提交真实 API Key。

## 如何运行

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

默认打开：

```bash
http://localhost:3000
```

如果需要指定端口：

```bash
npm run dev -- -p 3014
```

构建检查：

```bash
npm run build
```

data.go.kr 接口测试：

```bash
npm run test:data-go-kr
npm run test:data-go-kr-index
```

## 如何申请 data.go.kr API

1. 访问 [data.go.kr](https://www.data.go.kr/) 并登录。
2. 申请以下开放 API：
   - `금융위원회_주식시세정보`
   - `금융위원회_지수시세정보`
3. 确认 API Key 已启用，并放入 `.env.local` 的 `DATA_GO_KR_API_KEY`。
4. 设置：

```bash
STOCK_DATA_PROVIDER=real
KOREA_STOCK_API_SOURCE=data_go_kr
```

当前使用的接口：

- 股票详情、搜索、K 线：`GetStockSecuritiesInfoService/getStockPriceInfo`
- 指数行情：`GetMarketIndexInfoService/getStockMarketIndex`

## 当前真实数据来源

真实 `data.go.kr`：

- `getStockDetail(code)`
- `getStockCandles(code)`
- `searchStocks(keyword)`
- `getMarketOverview()` 中的 KOSPI / KOSDAQ
- `오늘의 기회 레이더`
- `인기 종목`
- `AI 분석 리포트` 的日별 종가行情上下文
- `관심종목 우선순위`
- `오늘의 관심종목 리포트`

项目统一数据入口：

```bash
lib/stock-provider.ts
```

data.go.kr 适配器位置：

```bash
lib/providers/data-go-kr.ts
```

KRX 适配器骨架位置：

```bash
lib/providers/krx.ts
```

## 当前仍使用 mock 或 fallback 的模块

- KRW/USD 汇率、市场情绪指数：仍为 mock 市场信号。
- 外国人 / 机构资金流：当前为 mock 或占位字段。
- 新闻情绪：当前为 mock 或占位字段。
- KRX API：已预留适配器骨架，尚未正式接入。
- Supabase：当前只保留客户端配置，自选股仍使用 `localStorage`。
- 全市场热门榜：当前基于代表股票池计算，不是全市场排名。

如果真实 API 无 Key、请求失败、返回空数据或字段缺失，系统会自动 fallback 到 mock data，避免页面崩溃。

## 安全说明

- 不要提交 `.env.local`。
- 不要把 `DATA_GO_KR_API_KEY` 写入前端组件。
- 只有服务端适配器读取 `process.env.DATA_GO_KR_API_KEY`。
- Vercel 部署时请在 Project Settings → Environment Variables 中配置 API Key。
- README 和示例环境变量不得写入真实 API Key。

## Vercel 部署

部署到 Vercel 时配置以下环境变量：

```bash
STOCK_DATA_PROVIDER=real
KOREA_STOCK_API_SOURCE=data_go_kr
DATA_GO_KR_API_KEY=你的_data_go_kr_key
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

如果暂时没有 OpenAI Key，页面仍可使用本地 fallback 报告。

## 投资免责声明

本项目中的行情、技术指标、AI 分析、风险评分、观察点和自选股日报仅供信息参考，不构成投资建议。股票投资有风险，可能发生本金损失，最终投资决策和责任由用户自行承担。
