"use client";
import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onChange: (delta: number) => void;
  label: string;
  min?: number;
  max?: number;
  className?: string;
};

export function QuantityStepper({ value, onChange, label, min = 1, max = 99, className = "" }: Props) {
  return (
    <div className={`stepper ${className}`} role="group" aria-label={`Cantidad de ${label}`}>
      <button type="button" onClick={() => onChange(-1)} disabled={value <= min} aria-label={`Reducir cantidad de ${label}`}>
        <Minus size={16} aria-hidden="true" />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(1)} disabled={value >= max} aria-label={`Aumentar cantidad de ${label}`}>
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
