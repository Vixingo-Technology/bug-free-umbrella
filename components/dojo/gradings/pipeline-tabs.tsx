"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export type PipelineTab = {
  key: string;
  label: string;
  count: number;
  actor: string;
  body: ReactNode;
};

export default function PipelineTabs({ tabs }: { tabs: PipelineTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <section className="bg-white border border-zinc-200 rounded-sm shadow-sm mb-6">
      <div className="border-b border-zinc-200 px-2 sm:px-3 py-2">
        <div role="tablist" className="flex flex-wrap items-center gap-y-1">
          {tabs.map((t, i) => {
            const isActive = t.key === current.key;
            const isLast = i === tabs.length - 1;
            return (
              <Fragment key={t.key}>
                <button
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(t.key)}
                  className={`relative px-2.5 sm:px-3 py-2 text-[11px] tracking-widest uppercase font-bold transition-colors focus:outline-none focus-visible:bg-zinc-50 rounded-sm ${
                    isActive
                      ? "text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {t.label}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-accent-red text-white"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {t.count}
                    </span>
                  </span>
                  {isActive && (
                    <span className="absolute inset-x-2.5 sm:inset-x-3 -bottom-2 h-0.5 bg-accent-red" />
                  )}
                </button>
                {!isLast && (
                  <ChevronRight
                    size={14}
                    aria-hidden
                    className="text-zinc-300 shrink-0"
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-5 py-4 border-b border-zinc-200 bg-zinc-50/50">
        <p className="text-xs text-zinc-500">{current.actor}</p>
      </div>

      <div className="px-4 sm:px-5">{current.body}</div>
    </section>
  );
}
