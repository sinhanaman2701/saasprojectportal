"use client";
import React from "react";
import { Check } from "lucide-react";

type StepLabel = { label: string };

type Props = {
  step: number;
  totalSteps: number;
  labels: StepLabel[];
  onStepClick: (n: number) => void;
};

export default function StepperBar({ step, totalSteps, labels, onStepClick }: Props) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2">
        {labels.map(({ label }, idx) => {
          const stepNum = idx + 1;
          const isComplete = stepNum < step;
          const isActive = stepNum === step;

          return (
            <React.Fragment key={stepNum}>
              <button
                onClick={() => isComplete && onStepClick(stepNum)}
                disabled={!isComplete}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all
                  ${isComplete
                    ? "bg-[#16A34A] text-white border-[#16A34A] cursor-pointer"
                    : isActive
                    ? "bg-[#1C1917] text-white border-[#1C1917] cursor-default"
                    : "bg-white text-[#A8A29E] border-[#E7E5E4] cursor-not-allowed"
                  }
                `}
              >
                {isComplete ? (
                  <Check size={13} strokeWidth={2.5} />
                ) : (
                  <span className="w-[13px] text-center">{stepNum}</span>
                )}
                <span>{label}</span>
              </button>
              {idx < labels.length - 1 && (
                <div className="flex-1 h-[2px] rounded-full bg-[#E7E5E4] overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] transition-all duration-500 ease-out"
                    style={{ width: isComplete ? "100%" : "0%" }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
