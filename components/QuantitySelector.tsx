"use client";

import { MAX_QUANTITY, MIN_QUANTITY } from "@/lib/validation";

export function QuantitySelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const clamp = (n: number) =>
    Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, n));

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-ink/10 bg-white p-2">
      <StepButton
        label="Decrease quantity"
        disabled={value <= MIN_QUANTITY}
        onClick={() => onChange(clamp(value - 1))}
      >
        −
      </StepButton>
      <span
        aria-live="polite"
        className="min-w-12 text-center text-3xl font-black tabular-nums"
      >
        {value}
      </span>
      <StepButton
        label="Increase quantity"
        disabled={value >= MAX_QUANTITY}
        onClick={() => onChange(clamp(value + 1))}
      >
        +
      </StepButton>
    </div>
  );
}

function StepButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-14 w-16 shrink-0 rounded-xl bg-ink text-3xl font-black leading-none text-cream transition active:scale-95 disabled:opacity-25"
    >
      {children}
    </button>
  );
}
