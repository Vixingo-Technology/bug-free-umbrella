"use client";

import { useState, type ReactNode } from "react";

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
      <div className="border-b border-zinc-200 overflow-x-auto">
        <div role="tablist" className="flex min-w-max">
          {tabs.map((t) => {
            const isActive = t.key === current.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.key)}
                className={`relative px-5 py-3 text-[11px] tracking-widest uppercase font-bold transition-colors focus:outline-none focus:bg-zinc-50 ${
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
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent-red" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/50">
        <p className="text-xs text-zinc-500">{current.actor}</p>
      </div>

      <div className="px-5">{current.body}</div>
    </section>
  );
}
