import { prisma } from "@/lib/db/prisma";
import { WalletService } from "./wallet.service";
import { TransactionType, Prisma } from "@prisma/client";

export class TradeService {
  /**
   * Hybrid Accrual Engine: Calculates and distributes profit to followers of a Copy-Trader.
   * Can be invoked either automatically (by daily cron) or manually (by Admin with custom percentage).
   */
  static async distributeTraderProfit(
    traderId: string,
    manualProfitPercentage?: number
  ) {
    const trader = await prisma.copyTrader.findUnique({
      where: { id: traderId },
      include: {
        followers: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!trader || !trader.isActive) {
      throw new Error("Trader not found or inactive.");
    }

    if (trader.followers.length === 0) {
      return { trader, processedCount: 0, totalProfitDistributed: 0 };
    }

    // Determine percentage: manual override or random value within [dailyRoiMin, dailyRoiMax]
    let roiPercentage = manualProfitPercentage;
    if (roiPercentage === undefined) {
      const min = Number(trader.dailyRoiMin);
      const max = Number(trader.dailyRoiMax);
      roiPercentage = Number((Math.random() * (max - min) + min).toFixed(2));
    }

    let totalDistributed = new Prisma.Decimal(0);
    const results = [];

    for (const follower of trader.followers) {
      const allocated = follower.allocatedUsd;
      const profitUsd = allocated.mul(new Prisma.Decimal(roiPercentage / 100));

      if (profitUsd.greaterThan(0)) {
        // Credit the follower's USD wallet atomically
        const { wallet, transaction } = await WalletService.creditBalance(
          follower.userId,
          "USD",
          profitUsd.toString(),
          TransactionType.PROFIT_ACCRUAL,
          `Copy-Trading Profit (${roiPercentage}%) from ${trader.name}`
        );

        // Update follower's cumulative totalEarned
        await prisma.userCopyTrade.update({
          where: { id: follower.id },
          data: {
            totalEarned: { increment: profitUsd },
          },
        });

        totalDistributed = totalDistributed.add(profitUsd);
        results.push({ userId: follower.userId, profitUsd, transactionId: transaction.id });
      }
    }

    return {
      traderName: trader.name,
      roiPercentage,
      processedFollowers: results.length,
      totalProfitDistributed: totalDistributed.toString(),
      results,
    };
  }

  /**
   * Automated cron worker that iterates through all active traders configured for autoTradeMode
   */
  static async runAutomatedDailyAccrual() {
    const activeAutoTraders = await prisma.copyTrader.findMany({
      where: {
        isActive: true,
        autoTradeMode: true,
      },
    });

    const executionSummary = [];

    for (const trader of activeAutoTraders) {
      try {
        const summary = await this.distributeTraderProfit(trader.id);
        executionSummary.push(summary);
      } catch (err: any) {
        console.error(`Error accruing profit for trader ${trader.name}:`, err.message);
      }
    }

    return executionSummary;
  }
}
