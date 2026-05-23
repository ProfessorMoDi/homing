"use client";

import { memo, useState } from "react";

// Hand-rolled collapsible JSON tree. We need this dependency-free both to
// keep the bundle small and to match the app's typography. Strings render
// with quotes, numbers/booleans/null get a colour hint, arrays and objects
// can be collapsed.

interface Props {
  value: unknown;
  initiallyCollapsed?: boolean;
  rootLabel?: string;
}

export function JsonView({ value, initiallyCollapsed = false, rootLabel }: Props) {
  return (
    <div className="dev-json">
      <Node
        value={value}
        keyLabel={rootLabel}
        depth={0}
        defaultCollapsed={initiallyCollapsed}
      />
    </div>
  );
}

const Node = memo(function Node({
  value,
  keyLabel,
  depth,
  defaultCollapsed,
}: {
  value: unknown;
  keyLabel?: string;
  depth: number;
  defaultCollapsed?: boolean;
}) {
  if (value === null) return <Leaf keyLabel={keyLabel} className="is-null" text="null" />;
  if (value === undefined) return <Leaf keyLabel={keyLabel} className="is-null" text="undefined" />;
  if (typeof value === "string") {
    return <Leaf keyLabel={keyLabel} className="is-string" text={`"${value}"`} />;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return <Leaf keyLabel={keyLabel} className="is-number" text={String(value)} />;
  }
  if (typeof value === "boolean") {
    return <Leaf keyLabel={keyLabel} className="is-boolean" text={value ? "true" : "false"} />;
  }
  if (Array.isArray(value)) {
    return (
      <Collapsible
        keyLabel={keyLabel}
        openLabel="["
        closeLabel="]"
        summary={`${value.length} item${value.length === 1 ? "" : "s"}`}
        depth={depth}
        defaultCollapsed={defaultCollapsed ?? depth >= 2}
      >
        {value.map((item, i) => (
          <Node
            key={i}
            keyLabel={String(i)}
            value={item}
            depth={depth + 1}
            defaultCollapsed={depth + 1 >= 2}
          />
        ))}
      </Collapsible>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <Collapsible
        keyLabel={keyLabel}
        openLabel="{"
        closeLabel="}"
        summary={`${entries.length} field${entries.length === 1 ? "" : "s"}`}
        depth={depth}
        defaultCollapsed={defaultCollapsed ?? depth >= 2}
      >
        {entries.map(([k, v]) => (
          <Node
            key={k}
            keyLabel={k}
            value={v}
            depth={depth + 1}
            defaultCollapsed={depth + 1 >= 2}
          />
        ))}
      </Collapsible>
    );
  }
  return <Leaf keyLabel={keyLabel} className="is-string" text={String(value)} />;
});

function Leaf({
  keyLabel,
  className,
  text,
}: {
  keyLabel?: string;
  className: string;
  text: string;
}) {
  return (
    <div className="dev-json__row">
      {keyLabel != null ? (
        <span className="dev-json__key">{keyLabel}:</span>
      ) : null}
      <span className={`dev-json__leaf ${className}`}>{text}</span>
    </div>
  );
}

function Collapsible({
  keyLabel,
  openLabel,
  closeLabel,
  summary,
  depth,
  defaultCollapsed,
  children,
}: {
  keyLabel?: string;
  openLabel: string;
  closeLabel: string;
  summary: string;
  depth: number;
  defaultCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <div className="dev-json__group" data-depth={depth}>
      <button
        type="button"
        className="dev-json__caret"
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="dev-json__arrow">{collapsed ? "▸" : "▾"}</span>
        {keyLabel != null ? (
          <span className="dev-json__key">{keyLabel}:</span>
        ) : null}
        <span className="dev-json__bracket">{openLabel}</span>
        {collapsed ? (
          <>
            <span className="dev-json__summary">{summary}</span>
            <span className="dev-json__bracket">{closeLabel}</span>
          </>
        ) : null}
      </button>
      {collapsed ? null : (
        <>
          <div className="dev-json__children">{children}</div>
          <div className="dev-json__bracket dev-json__bracket--close">
            {closeLabel}
          </div>
        </>
      )}
    </div>
  );
}
