import React from "react";

export default function ErrorRenderer({ spec, onSuggestion }) {
  const fallback = spec?.scene?.fallback || spec?.fallback || {};
  const message =
    fallback.message ||
    spec?.error ||
    "I could not interpret that request.";
  const suggestions = Array.isArray(fallback.suggestions)
    ? fallback.suggestions
    : [];

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-slate-200 shadow-xl">
        <h3 className="text-lg font-semibold text-amber-300">Couldn&apos;t generate a scene</h3>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        {suggestions.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Try one of these
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((item, idx) => (
                <button
                  key={`${item}-${idx}`}
                  type="button"
                  onClick={() => onSuggestion?.(item)}
                  disabled={!onSuggestion}
                  className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 hover:text-white disabled:cursor-default disabled:opacity-60"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
