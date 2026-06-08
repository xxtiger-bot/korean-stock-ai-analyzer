import { ScreenshotPlaceholder } from "@/components/pwa/ScreenshotPlaceholder";

type StepCardProps = {
  step: number;
  description: string;
  screenshotLabel: string;
};

export function StepCard({ step, description, screenshotLabel }: StepCardProps) {
  return (
    <article className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
          {step}
        </span>
        <p className="min-w-0 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
          {description}
        </p>
      </div>
      <ScreenshotPlaceholder label={screenshotLabel} />
    </article>
  );
}
