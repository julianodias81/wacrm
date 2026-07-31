"use client";

/**
 * Reusable field components shared across every per-node form.
 *
 * `NodeKeySelect` — picks a node from the flow's node list, rendered
 * with the source node's icon so the dropdown reads as
 * "destination = ◇ menu" rather than an opaque slug.
 *
 * `NextNodeRow` — wraps NodeKeySelect with a label; the most common
 * per-node form row ("after this node, advance to…").
 *
 * `TextRow` — wraps Input or Textarea behind a label. Pure UI sugar
 * to keep per-node forms uncluttered.
 *
 * Lives in src/components/flows/forms/ so both the list view's
 * collapsed-card editor and the canvas view's side-panel editor
 * (introduced in this PR) mount the exact same form components.
 */

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { NODE_META, type BuilderNode } from "../shared";

/** Base UI's SelectValue never reads a SelectItem's rendered text — it
 *  only knows a label if given one explicitly. This builds that lookup
 *  as a `children` render-fn, keyed by value. See AgentSelectRow's
 *  original bug: after picking an agent, the field showed the raw
 *  user_id UUID instead of the name. */
export function selectLabelFn(
  items: { value: string; label: string }[],
  placeholder: string,
): (v: string) => string {
  return (v) => items.find((i) => i.value === v)?.label ?? placeholder;
}

export function TextRow({
  label,
  value,
  onChange,
  rows = 1,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      {rows > 1 ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          maxLength={maxLength}
          className="bg-muted"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          className="bg-muted"
        />
      )}
    </div>
  );
}

export function NextNodeRow({
  value,
  allNodes,
  currentKey,
  onChange,
  label,
}: {
  value: string;
  allNodes: BuilderNode[];
  currentKey: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <NodeKeySelect
        value={value || null}
        nodes={allNodes}
        excludeKey={currentKey}
        onChange={(v) => onChange(v ?? "")}
        placeholder={useTranslations("Flows.builder.form")("pickNextNode")}
      />
    </div>
  );
}

interface AgentOption {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

/** Agent dropdown for the handoff node's optional `assign_to`. Falls
 *  back to "no assignment only" if the members endpoint is unreachable. */
export function AgentSelectRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("Flows.builder.form");
  const [members, setMembers] = useState<AgentOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/members", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { members?: AgentOption[] };
        if (!cancelled) setMembers(json.members ?? []);
      } catch {
        // Members endpoint unreachable — field falls back to unassigned-only.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <Select
        value={value || "__none__"}
        onValueChange={(v) => onChange(v === "__none__" ? "" : (v ?? ""))}
      >
        <SelectTrigger className="bg-muted">
          <SelectValue>
            {selectLabelFn(
              [
                { value: "__none__", label: t("noAssignment") },
                ...members.map((m) => ({
                  value: m.user_id,
                  label: m.full_name || m.email || m.user_id,
                })),
              ],
              t("noAssignment"),
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">{t("noAssignment")}</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.user_id} value={m.user_id}>
              {m.full_name || m.email || m.user_id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function NodeKeySelect({
  value,
  nodes,
  excludeKey,
  onChange,
  placeholder,
  className,
}: {
  value: string | null;
  nodes: BuilderNode[];
  excludeKey?: string;
  onChange: (v: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const t = useTranslations("Flows.builder.form");
  const options = nodes.filter((n) => n.node_key !== excludeKey);
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
    >
      <SelectTrigger className={cn("bg-muted", className)}>
        <SelectValue>
          {selectLabelFn(
            [
              { value: "__none__", label: t("none") },
              ...options.map((n) => ({ value: n.node_key, label: n.node_key })),
            ],
            placeholder ?? "—",
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{t("none")}</SelectItem>
        {options.map((n) => {
          const Icon = NODE_META[n.node_type].icon;
          return (
            <SelectItem key={n.node_key} value={n.node_key}>
              <span className="inline-flex items-center gap-1.5">
                <Icon
                  className={cn("h-3 w-3", NODE_META[n.node_type].color)}
                />
                {n.node_key}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
