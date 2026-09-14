"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MarketCoinSnapshot } from "@/lib/market/service";
import { Button } from "@/components/ui/button";
import { Panel } from "../panel";
import { CoinIdentity } from "../coin-identity";

type Feed = { coins: MarketCoinSnapshot[]; isFallback: boolean; isStale: boolean; fetchedAt: string };
const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 4 : 2 }).format(value);

export function MarketWatch() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [selected, setSelected] = useState("BTC");
  const [error, setError] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let disposed = false;
    let busy = false;
    const controller = new AbortController();
    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const response = await fetch("/api/market/coins", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        if (!response.ok) throw new Error("Market feed unavailable");
        const value: Feed = await response.json();
        if (!Array.isArray(value.coins) || value.isFallback) throw new Error("Live quotes unavailable");
        if (!disposed) {
          setFeed({ ...value, isStale: value.isStale || !Number.isFinite(Date.parse(value.fetchedAt)) || Date.now() - Date.parse(value.fetchedAt) > 120_000 });
          setError(false);
        }
      } catch {
        if (!disposed) setError(true);
      } finally { busy = false; }
    }
    if (!paused) void refresh();
    const timer = paused ? undefined : window.setInterval(refresh, 60_000);
    const visible = () => { if (!paused) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { disposed = true; controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [paused]);

  const coin = feed?.coins.find((item) => item.currency === selected) ?? feed?.coins[0];
  const points = (coin?.sparkline ?? []).filter((price) => Number.isFinite(price) && price > 0).map((price, index) => ({ index, price }));
  const first = points[0]?.price;
  const last = points.at(-1)?.price;
  const rising = first !== undefined && last !== undefined && last >= first;
  const color = rising ? "var(--chart-2, #16a34a)" : "var(--destructive, #dc2626)";
  const stale = feed && (error || feed.isStale);

  return <Panel title="Market watch" description="Coin prices in USD, 24-hour moves and seven-day trends."
    action={<Button variant="outline" size="sm" onClick={() => setPaused(!paused)}>{paused ? "Resume updates" : "Pause updates"}</Button>}>
    <p className="ca-help" role="status">{paused ? "Updates paused" : stale ? "Updates delayed. Last available prices shown." : feed ? "Refreshes every minute" : error ? "Market prices are unavailable. Retrying every minute." : "Loading market prices…"}</p>
    {feed && <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6" aria-label="Choose a coin">
        {feed.coins.map((item) => <button key={item.currency} type="button" aria-pressed={coin?.currency === item.currency} onClick={() => setSelected(item.currency)}
          className={`rounded-lg border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${coin?.currency === item.currency ? "border-primary bg-muted" : "border-border hover:bg-muted/50"}`}>
          <CoinIdentity currency={item.currency} />
          <p className="mt-3 font-mono text-lg tabular-nums">{usd(Number(item.priceUsd))}</p>
          <p className="ca-help">{item.change24hNumber >= 0 ? "↑" : "↓"} {item.change24h}% · 24h</p>
        </button>)}
      </div>
      {coin && <>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="ca-h3">{coin.name} · 7 days</h3><p className="ca-help">{points.length > 1 ? `${rising ? "Up" : "Down"} ${Math.abs((last! / first! - 1) * 100).toFixed(2)}% over the chart period` : "Price history unavailable"}</p></div>
        {points.length > 1 && <>
          <div className="h-64 min-w-0 md:h-80" role="img" aria-label={`${coin.name} seven-day price trend. Starts at ${usd(first!)} and ends at ${usd(last!)}.`}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 320 }}>
              <AreaChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="index" ticks={[0, points.length - 1]} tickFormatter={(index) => index === 0 ? "7 days ago" : "Latest sample"} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis domain={["auto", "auto"]} width={80} tickFormatter={(value) => usd(Number(value))} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip labelFormatter={() => "Historical price sample"} formatter={(value) => [usd(Number(value)), "USD"]} contentStyle={{ background: "var(--background)", borderColor: "var(--border)", borderRadius: 8 }} />
                <Area dataKey="price" type="linear" stroke={color} fill={color} fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="ca-help">Period low {usd(Math.min(...points.map(p => p.price)))} · Period high {usd(Math.max(...points.map(p => p.price)))}</p>
        </>}
        <p className="ca-help">Quote updated {new Date(coin.quotedAt).toLocaleString()}. Chart samples may lag the latest quote.</p>
      </>}
    </>}
    <p className="ca-help">Market data from <a href="https://www.coingecko.com/" target="_blank" rel="noreferrer" className="underline">CoinGecko</a>. Indicative prices, not execution quotes or account returns.</p>
  </Panel>;
}
