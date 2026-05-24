# KRX Insight MVP 测试与发布指南（v1.0 / v1.1）

## 1. 项目概览
KRX Insight 是一个面向韩国股票用户的分析工具，核心目标是把「价格 + 技术指标 + AI 参考解读 + 持仓诊断」整合为可日常使用的工作台。  
当前 MVP 核心功能包括：
- 首页市场信息与股票入口（검색、인기 종목、오늘의 투자 체크리스트）
- 股票详情页（현재가/최근 종가来源区分、K线、指标、AI 分析）
- `/portfolio` 持仓管理与 AI 诊断（本地/云同步）
- Supabase 登录（Email OTP）
- 移动端导航与分区（tabs + bottom nav）
- 调试页 `/debug/market-data`

---

## 2. 本地启动
```bash
cd "C:\Users\fengy\Documents\Codex\2026-05-18\korean-stock-kis-clean"
npm run dev
```
默认可在浏览器打开：
- [http://localhost:3000](http://localhost:3000)

---

## 3. 常用检查命令
```bash
npm run build
npm run check:mvp
npm run check:mobile
```

说明：
- `check:mvp`：发布前基础路由与关键文案检查
- `check:mobile`：移动端验收（CDP 模式 + fallback HTTP 模式）

---

## 4. 上线前检查页面
- `/admin/checklist`  
用于站长快速确认 MVP 发布状态（页面、认证、数据、同步、法律页面）。

---

## 5. 主要页面检查清单
发布前至少人工访问以下路径并确认无明显错误：
- `/`
- `/stocks/005930`
- `/portfolio`
- `/pricing`
- `/mypage`
- `/debug/market-data`
- `/about`
- `/privacy`
- `/disclaimer`

重点看：
- 无 `Application error`
- 无明显布局错位/样式丢失
- 移动端无横向滚动

---

## 6. Supabase 表说明
当前使用/建议使用表：
- `profiles`（用户资料、plan）
- `portfolio_holdings`（持仓）
- `portfolio_alert_rules`（提醒条件）
- `portfolio_reports`（日报保存）

已新增或规划新增：
- `portfolio_risk_snapshots`（风险快照对比）
- `watchlist_items`（关注股票云同步，规划中）

注意：
- 不要在文档或前端暴露任何 service role key
- RLS 必须开启并限制用户只访问自己的数据

---

## 7. Supabase Auth（Email OTP）
### 登录方式
- 使用 Email OTP（验证码）
- UI 入口：`로그인`

### 邮件模板要求
- 必须使用：`{{ .Token }}`
- 不使用：`{{ .ConfirmationURL }}`（避免 localhost/callback 问题）

### rate limit 处理
- 正常发送成功：60 秒冷却
- `email rate limit exceeded`：180 秒冷却
- 前端应显示可理解提示，不要卡在 `전송 중...`

### 登录失败排查
1. 检查 `NEXT_PUBLIC_SUPABASE_URL` 是否为 `https://xxx.supabase.co`
2. 检查 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否存在
3. 检查 Supabase Email provider 是否启用
4. 检查浏览器网络/DNS（`ERR_NAME_NOT_RESOLVED`）
5. 检查是否触发发送频率限制（429）

---

## 8. KIS / data.go.kr 数据源说明
### 价格与指标分工
- `KIS`：当前价（현재가）
- `data.go.kr`：最近收盘价（최근 종가）+ 日线 + 技术指标（MA/RSI/MACD）

### 限制与常见错误
- KIS token 限制（例：`EGW00133`，1分钟限制）
- KIS quote 频率限制（例：`EGW00201`，超出每秒请求数）

### 调试方法
使用 `/debug/market-data`：
- 看 token/quote 是否成功
- 看 HTTP status、`msg_cd`、`msg1`
- 确认当前页面最终使用的是哪种数据来源

---

## 9. 手机端检查（重点）
检查以下移动端体验是否成立：
- 底部导航（홈 / 검색 / 보유 / 리포트 / 내 계정）
- 详情页 tabs（요약 / 차트 / AI / 지표 / 리스크）
- portfolio tabs（요약 / 보유 / 알림 / 리포트）
- Guide 以 bottom sheet 展示，内容可滚动
- 空数据不显示误导性 `0`（如 PER/EPS、외국인 보유율）

---

## 10. Git / Release 流程
```bash
git status
git add .
git commit -m "chore: release prep"
git push
```

打版本与发布（示例）：
```bash
git tag v1.0-mvp
git push origin v1.0-mvp
```

然后到 GitHub：
1. 创建 Release
2. 选择 tag（如 `v1.0-mvp`）
3. 填写发布说明

---

## 11. Vercel 部署检查
1. Deployments 状态应为 `Ready` + `Current`
2. 检查环境变量完整性（仅检查是否存在，不贴真实值）
3. 线上路径抽查：
   - `/`
   - `/stocks/005930`
   - `/portfolio`
   - `/debug/market-data`
   - `/admin/checklist`
4. 确认无客户端崩溃与严重 console error

---

## 12. 常见问题排查
### 1) `ERR_CONNECTION_REFUSED`
- 本地服务未启动或端口不一致
- 先确认 `npm run dev` 是否正常监听

### 2) Supabase `email rate limit exceeded`
- 属于发送频率限制
- 等待冷却（180 秒）后重试

### 3) KIS `EGW00133`
- token 请求过频
- 启用 token 缓存与 60 秒节流

### 4) KIS `EGW00201`
- 当前价请求过频
- 采用串行请求 + quote 缓存

### 5) CSS 丢失
- 检查 `app/layout.tsx` 是否仍 `import "./globals.css"`
- 清理 `.next` 后重新启动

### 6) 手机访问 localhost 打不开
- 手机与电脑不在同一网络，或防火墙阻断
- 用电脑局域网 IP + 对应端口访问

### 7) Magic Link 打开 localhost 失败
- 建议使用 Email OTP（站内验证码）
- 避免依赖 `{{ .ConfirmationURL }}`

---

## 13. 后续 v1.1 / v1.2 规划
### v1.1（优先）
- 오늘의 투자 체크리스트 强化
- 风险变化追踪（昨日 vs 今日）
- 关注股票云同步（watchlist_items）

### v1.2（商业化方向）
- Pro 功能分层
- 更多自动化报告与提醒能力
- 团队/多组合能力（Business）

---

## 14. 邀请奖励测试流程（친구 초대 리워드）
按下面流程可验证 referral + Pro 体验奖励：

1. 使用 **A 用户** 登录，进入 `/mypage`。
2. 点击 `초대 링크 복사`，拿到邀请链接（例如 `/beta?ref=xxx`）。
3. 打开无痕窗口，用无痕窗口访问该 `/beta?ref=xxx` 链接。
4. 在无痕窗口用 **B 用户** 完成登录。
5. 到 Supabase 检查 `referrals` 表：应新增一条 `referred_user_id = B` 的记录。
6. 到 Supabase 检查 A 用户的 `profiles.pro_expires_at`：应在原基础上增加 `+3 days`。
7. 回到 A 用户 `/mypage`，确认：
   - `초대 성공 수` 增加
   - `Pro 체험중 · N일 남음` 正常显示

注意：
- 同一个 `referred_user_id` 只能奖励一次。
- 自己邀请自己无效。
- 无效 referral code 会被忽略，不应导致页面崩溃。

---

## 附：建议执行顺序（发布前）
1. `npm run build`
2. `npm run check:mvp`
3. `npm run check:mobile`
4. 人工检查 `/admin/checklist`
5. 人工抽查核心页面与移动端
6. 再进行 tag + GitHub Release + Vercel 发布确认
