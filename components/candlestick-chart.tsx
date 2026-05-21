"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui-states";
import { formatKRW, formatNumber } from "@/lib/format";
import type { TechnicalPoint } from "@/lib/types";

type CandlestickChartProps = {
  series: TechnicalPoint[];
};

export function CandlestickChart({ series }: CandlestickChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(860);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const safeSeries = useMemo(() => (Array.isArray(series) ? series : []), [series]);
  const visible = useMemo(() => safeSeries.slice(-72), [safeSeries]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setWidth(Math.max(260, Math.floor(entry.contentRect.width)));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = width < 480 ? 320 : width < 768 ? 352 : 390;
  const left = 12;
  const right = width < 420 ? 48 : 72;
  const top = width < 480 ? 14 : 18;
  const priceHeight = Math.round(height * 0.66);
  const volumeTop = top + priceHeight + (width < 480 ? 28 : 32);
  const volumeHeight = Math.max(44, height - volumeTop - 20);
  const plotWidth = width - left - right;
  const step = visible.length > 0 ? plotWidth / visible.length : plotWidth;
  const candleWidth = Math.max(4, Math.min(10, step * 0.55));
  const maxPrice = Math.max(...visible.map((item) => item.high).filter(Number.isFinite), 1);
  const minPrice = Math.min(...visible.map((item) => item.low).filter(Number.isFinite), maxPrice);
  const maxVolume = Math.max(...visible.map((item) => item.volume).filter(Number.isFinite), 1);
  const priceRange = maxPrice - minPrice || 1;

  function x(index: number) {
    return left + index * step + step / 2;
  }

  function y(price: number) {
    return top + ((maxPrice - price) / priceRange) * priceHeight;
  }

  function volumeY(volume: number) {
    return volumeTop + volumeHeight - (volume / maxVolume) * volumeHeight;
  }

  function linePath(key: "ma5" | "ma20" | "ma60") {
    let started = false;
    return visible
      .map((item, index) => {
        const value = item[key];
        if (value === null) return "";
        const point = `${x(index).toFixed(1)},${y(value).toFixed(1)}`;
        if (!started) {
          started = true;
          return `M ${point}`;
        }
        return `L ${point}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  const active =
    activeIndex === null ? visible[visible.length - 1] : visible[activeIndex];

  return (
    <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">차트</p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">일봉 K라인</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm bg-amber-500" />
            MA5
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm bg-brand" />
            MA20
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm bg-mint" />
            MA60
          </span>
        </div>
      </div>
      <div
        ref={wrapperRef}
        className="relative mt-4 h-[320px] w-full overflow-hidden rounded-lg border border-line bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 sm:h-[352px] lg:h-[390px]"
      >
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <EmptyState
              compact
              title="K선 데이터 없음"
              description="표시할 일별 종가 데이터가 없습니다."
            />
          </div>
        ) : (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const index = Math.floor(
              ((event.clientX - rect.left) / rect.width) * visible.length
            );
            setActiveIndex(Math.max(0, Math.min(visible.length - 1, index)));
          }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const lineY = top + ratio * priceHeight;
            const label = maxPrice - ratio * priceRange;
            return (
              <g key={ratio}>
                <line
                  x1={left}
                  x2={width - right + (width < 420 ? 18 : 42)}
                  y1={lineY}
                  y2={lineY}
                  stroke="#dfe6ee"
                  strokeDasharray="4 6"
                />
                <text
                  x={width - right + (width < 420 ? 20 : 48)}
                  y={lineY + 4}
                  fill="#64748b"
                  fontSize={width < 420 ? "10" : "11"}
                  fontWeight="700"
                >
                  {Math.round(label).toLocaleString("ko-KR")}
                </text>
              </g>
            );
          })}
          {visible.map((item, index) => {
            const isUp = item.close >= item.open;
            const color = isUp ? "#e23b3b" : "#2563eb";
            const center = x(index);
            const bodyTop = y(Math.max(item.open, item.close));
            const bodyHeight = Math.max(2, Math.abs(y(item.open) - y(item.close)));
            const volumeHeightValue = volumeTop + volumeHeight - volumeY(item.volume);

            return (
              <g key={item.date}>
                <line
                  x1={center}
                  x2={center}
                  y1={y(item.high)}
                  y2={y(item.low)}
                  stroke={color}
                  strokeWidth="1.4"
                />
                <rect
                  x={center - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  rx="1"
                  fill={isUp ? "#fff" : color}
                  stroke={color}
                  strokeWidth="1.4"
                />
                <rect
                  x={center - candleWidth / 2}
                  y={volumeY(item.volume)}
                  width={candleWidth}
                  height={volumeHeightValue}
                  rx="1"
                  fill={isUp ? "rgba(226,59,59,0.32)" : "rgba(37,99,235,0.32)"}
                />
              </g>
            );
          })}
          <path d={linePath("ma5")} fill="none" stroke="#f59e0b" strokeWidth="2" />
          <path d={linePath("ma20")} fill="none" stroke="#1769ff" strokeWidth="2" />
          <path d={linePath("ma60")} fill="none" stroke="#10b981" strokeWidth="2" />
          <line
            x1={left}
            x2={width - right + (width < 420 ? 18 : 42)}
            y1={volumeTop - 14}
            y2={volumeTop - 14}
            stroke="#dfe6ee"
          />
          {[0, 18, 36, 54, 71].map((index) => {
            const item = visible[index];
            if (!item) return null;
            return (
              <text
                key={item.date}
                x={x(index)}
                y={height - 12}
                textAnchor="middle"
                fill="#64748b"
                fontSize="11"
                fontWeight="700"
              >
                {item.date.slice(5)}
              </text>
            );
          })}
          {activeIndex !== null && (
            <line
              x1={x(activeIndex)}
              x2={x(activeIndex)}
              y1={top}
              y2={volumeTop + volumeHeight}
              stroke="#111827"
              strokeDasharray="4 5"
              strokeOpacity="0.35"
            />
          )}
        </svg>
        )}
        {active && (
          <div className="absolute left-3 top-3 w-[min(184px,calc(100%-1.5rem))] min-w-0 rounded-lg border border-line bg-white/95 p-3 text-xs shadow-soft dark:border-dark-line dark:bg-slate-950/90">
            <p className="font-bold text-ink dark:text-white">{active.date}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-semibold text-slate-500">
              <span>시가</span>
              <span className="text-right text-ink dark:text-white">{formatKRW(active.open)}</span>
              <span>고가</span>
              <span className="text-right text-danger">{formatKRW(active.high)}</span>
              <span>저가</span>
              <span className="text-right text-down">{formatKRW(active.low)}</span>
              <span>종가</span>
              <span className="text-right text-ink dark:text-white">{formatKRW(active.close)}</span>
              <span>거래량</span>
              <span className="text-right text-ink dark:text-white">{formatNumber(active.volume)}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
