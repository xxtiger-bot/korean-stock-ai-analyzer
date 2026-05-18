function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function formatKRW(value: number) {
  const safeValue = safeNumber(value);

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(safeValue);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(safeNumber(value)));
}

export function formatCompactKRW(value: number) {
  const safeValue = safeNumber(value);

  if (safeValue >= 1_0000_0000_0000) {
    return `${(safeValue / 1_0000_0000_0000).toFixed(1)}조원`;
  }

  if (safeValue >= 1_0000_0000) {
    return `${(safeValue / 1_0000_0000).toFixed(1)}억원`;
  }

  return formatKRW(safeValue);
}

export function formatPercent(value: number) {
  const safeValue = safeNumber(value);
  const sign = safeValue > 0 ? "+" : "";
  return `${sign}${safeValue.toFixed(2)}%`;
}

export function changeColorClass(value: number) {
  const safeValue = safeNumber(value);

  if (safeValue > 0) return "text-danger dark:text-red-300";
  if (safeValue < 0) return "text-down dark:text-blue-300";
  return "text-slate-500 dark:text-slate-400";
}

export function changeBgClass(value: number) {
  const safeValue = safeNumber(value);

  if (safeValue > 0) {
    return "border-red-100 bg-red-50 text-danger dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300";
  }
  if (safeValue < 0) {
    return "border-blue-100 bg-blue-50 text-down dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300";
  }
  return "border-slate-100 bg-slate-50 text-slate-500 dark:border-dark-line dark:bg-slate-800/60 dark:text-slate-400";
}
