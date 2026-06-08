type ScreenshotPlaceholderProps = {
  label: string;
  hint?: string;
};

export function ScreenshotPlaceholder({ label, hint }: ScreenshotPlaceholderProps) {
  return (
    <div className="mt-3 rounded-lg border border-dashed border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
      <div className="aspect-[9/16] w-full rounded-md border border-line bg-white/90 dark:border-dark-line dark:bg-slate-950/80" />
      <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">{label}</p>
      <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
        {hint ?? "실제 설치 화면 캡처를 이 위치에 교체할 수 있습니다."}
      </p>
    </div>
  );
}
