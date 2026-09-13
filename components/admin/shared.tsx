"use client";
import Link from "next/link";
import { useId, useState, type ReactNode, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SemanticBadge,
  SemanticNotice,
} from "@/components/dashboard/semantic-status";
import type { StatusTone } from "@/lib/dashboard/status-tone";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Panel } from "@/components/dashboard/panel";
import { useAdminRoute } from "./shell";

export function AdminLink({
  to = "",
  children,
  primary = false,
}: {
  to?: string;
  children: ReactNode;
  primary?: boolean;
}) {
  const { href } = useAdminRoute();
  return (
    <Button asChild variant={primary ? "default" : "outline"}>
      <Link href={href(to)}>{children}</Link>
    </Button>
  );
}
export function Field({
  label,
  error,
  hint,
  multiline,
  ...props
}: {
  label: string;
  error?: string;
  hint?: string;
  multiline?: boolean;
} & ComponentProps<typeof Input>) {
  const id = useId();
  const shared = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `${id}-help` : undefined,
  };
  return (
    <div className="admin-field">
      <Label htmlFor={id}>
        {label}
        {props.required ? " *" : ""}
      </Label>
      {multiline ? (
        <Textarea
          {...shared}
          name={props.name}
          value={props.value as string}
          required={props.required}
          maxLength={props.maxLength ?? 3000}
          disabled={props.disabled}
          onChange={
            props.onChange as unknown as ComponentProps<
              typeof Textarea
            >["onChange"]
          }
          rows={4}
        />
      ) : (
        <Input {...props} {...shared} />
      )}{" "}
      {(error || hint) && (
        <p
          id={`${id}-help`}
          className={error ? "ca-help text-destructive" : "ca-help"}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
export function Notice({
  children,
  error = false,
  tone = "info",
}: {
  children: ReactNode;
  error?: boolean;
  tone?: StatusTone;
}) {
  return (
    <SemanticNotice tone={error ? "danger" : tone}>{children}</SemanticNotice>
  );
}
export function Status({ children }: { children: string }) {
  return <SemanticBadge label={children} />;
}
export function Portrait({
  name,
  src,
  alt,
}: {
  name: string;
  src?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      className="admin-avatar"
      src={src}
      alt={alt ?? name}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="admin-avatar ca-label" aria-hidden="true">
      {name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("") || "CA"}
    </span>
  );
}
export function Records({
  title,
  headers,
  rows,
  empty = "No records match these filters.",
}: {
  title: string;
  headers: string[];
  rows: { id: string; cells: ReactNode[] }[];
  empty?: string;
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pageCount);
  const slice = rows.slice((current - 1) * 10, current * 10);
  return (
    <>
      {rows.length ? (
        <>
          <div
            className="admin-table-wrap"
            role="region"
            aria-label={`${title}, scroll horizontally for more columns`}
            tabIndex={0}
          >
            <Table>
              <TableCaption className="sr-only">{title}</TableCaption>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => (
                    <TableHead key={h} scope="col">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.map((row) => (
                  <TableRow key={row.id}>
                    {row.cells.map((cell, i) => (
                      <TableCell key={i} className="py-4 align-top">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3 pt-4">
            <p className="ca-help">
              {rows.length} records · Page {current} of {pageCount}
            </p>
            <div className="admin-actions">
              <Button
                variant="outline"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={current >= pageCount}
                onClick={() => setPage(current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <p className="py-8 ca-body text-muted-foreground">{empty}</p>
      )}
    </>
  );
}
export function Missing({ entity }: { entity: string }) {
  return (
    <Panel title={`${entity} not found`}>
      <p className="ca-body">This record is not available in this workspace.</p>
      <div className="mt-4">
        <AdminLink>Back to overview</AdminLink>
      </div>
    </Panel>
  );
}
