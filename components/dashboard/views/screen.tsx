"use client";

import type { RoutePattern } from "@/lib/dashboard/navigation";
import type { ScreenData } from "@/lib/dashboard/screen-data";
import { Activity, Assets, Overview } from "./portfolio";
import { Deposit, Withdraw } from "./funding";
import { Allocations, Signals, Traders } from "./trading";
import { Help, Notifications, Settings } from "./account";

export function DashboardScreen({
  route,
  data,
  retry,
  referenceTime,
}: {
  route: RoutePattern;
  data: ScreenData;
  retry?: () => void;
  referenceTime?: string;
}) {
  const props = { data, retry };
  switch (route) {
    case "/dashboard":
      return <Overview {...props} />;
    case "/dashboard/assets":
      return <Assets {...props} />;
    case "/dashboard/assets/[currency]":
      return <Assets {...props} detail />;
    case "/dashboard/activity":
      return <Activity {...props} />;
    case "/dashboard/activity/[transactionId]":
      return <Activity {...props} detail />;
    case "/dashboard/deposit":
      return <Deposit {...props} referenceTime={referenceTime} />;
    case "/dashboard/withdraw":
      return <Withdraw {...props} referenceTime={referenceTime} />;
    case "/dashboard/traders":
      return <Traders {...props} />;
    case "/dashboard/traders/[traderId]":
      return <Traders {...props} detail />;
    case "/dashboard/copy-trades":
      return <Allocations {...props} />;
    case "/dashboard/copy-trades/[allocationId]":
      return <Allocations {...props} detail />;
    case "/dashboard/signals":
      return <Signals {...props} />;
    case "/dashboard/notifications":
      return <Notifications {...props} />;
    case "/dashboard/settings/profile":
      return <Settings {...props} section="profile" />;
    case "/dashboard/settings/security":
      return <Settings {...props} section="security" />;
    case "/dashboard/settings/verification":
      return <Settings {...props} section="verification" />;
    case "/dashboard/help":
      return <Help />;
  }
}
