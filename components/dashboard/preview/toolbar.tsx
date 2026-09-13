"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId } from "react";

import { Switch } from "@/components/ui/switch";
import { SCENARIOS } from "@/lib/dashboard/fixtures/scenarios";

import { PREVIEW_ROOT } from "../actions-context";
import { usePreviewData } from "./provider";

/**
 * Design-review tools above the header: scenario select (navigates with
 * `?scenario=`), theme select, loading/read-error toggles and a link to the
 * component reference. Development only.
 */
export function PreviewToolbar() {
  const { scenarioId, showLoading, showReadError, setShowLoading, setShowReadError } = usePreviewData();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname() ?? PREVIEW_ROOT;
  const ids = {
    scenario: useId(),
    theme: useId(),
    loading: useId(),
    error: useId(),
  };

  const selectScenario = (id: string) => {
    const params = new URLSearchParams();
    params.set("scenario", id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div role="region" aria-label="Design review tools" className="ca-preview-toolbar" data-slot="preview-toolbar">
      <p className="ca-label m-0 text-muted-foreground">
        Design review <span aria-hidden="true">·</span> fixtures only <span aria-hidden="true">·</span> no live account
      </p>
      <label className="ca-toolbar-field" htmlFor={ids.scenario}>
        <span>Scenario</span>
        <select id={ids.scenario} value={scenarioId} onChange={(event) => selectScenario(event.target.value)}>
          {SCENARIOS.map((scenario) => (
            <option key={scenario.id} value={scenario.id} title={scenario.description}>
              {scenario.label}
            </option>
          ))}
        </select>
      </label>
      <label className="ca-toolbar-field" htmlFor={ids.theme}>
        <span>Theme</span>
        <select id={ids.theme} value={theme ?? "system"} onChange={(event) => setTheme(event.target.value)}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <span className="ca-toolbar-field">
        <Switch id={ids.loading} checked={showLoading} onCheckedChange={setShowLoading} />
        <label htmlFor={ids.loading}>Show loading skeletons</label>
      </span>
      <span className="ca-toolbar-field">
        <Switch id={ids.error} checked={showReadError} onCheckedChange={setShowReadError} />
        <label htmlFor={ids.error}>Show read error</label>
      </span>
      <Link
        href={`${PREVIEW_ROOT}/components?scenario=${scenarioId}`}
        className="ml-auto underline underline-offset-4 hover:text-foreground"
      >
        Component reference
      </Link>
    </div>
  );
}
