export function formatKRW(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

export function formatCompactKRW(value: number) {
  if (value >= 1_0000_0000_0000) {
    return `${(value / 1_0000_0000_0000).toFixed(1)}조원`;
  }

  if (value >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(1)}억원`;
  }

  return formatKRW(value);
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function changeColorClass(value: number) {
  if (value > 0) return "text-danger dark:text-red-300";
  if (value < 0) return "text-down dark:text-blue-300";
  return "text-slate-500 dark:text-slate-400";
}

export function changeBgClass(value: number) {
  if (value > 0) {
    return "border-red-100 bg-red-50 text-danger dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300";
  }
  if (value < 0) {
    return "border-blue-100 bg-blue-50 text-down dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300";
  }
  return "border-slate-100 bg-slate-50 text-slate-500 dark:border-dark-line dark:bg-slate-800/60 dark:text-slate-400";
}
