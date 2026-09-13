import { prisma } from "@/lib/db/prisma";
import { TransactionType, TxStatus, Prisma } from "@prisma/client";

export class WalletService {
  /**
   * Initializes default multi-currency wallets for a newly registered user
   */
  static async initializeWallets(userId: string) {
    const supportedCurrencies = ["BTC", "ETH", "USDT", "USD"];
    
    const walletCreations = supportedCurrencies.map((currency) =>
      prisma.wallet.upsert({
        where: {
          userId_currency: {
            userId,
            currency,
          },
        },
        update: {},
        create: {
          userId,
          currency,
          balance: new Prisma.Decimal(0),
          totalProfit: new Prisma.Decimal(0),
        },
      })
    );

    return await prisma.$transaction(walletCreations);
  }

  /**
   * Atomically credits balance and logs transaction
   */
  static async creditBalance(
    userId: string,
    currency: string,
    amount: number | string,
    type: TransactionType,
    notes?: string
  ) {
    const decimalAmount = new Prisma.Decimal(amount);

    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency } },
        update: {
          balance: { increment: decimalAmount },
          totalProfit: type === TransactionType.PROFIT_ACCRUAL ? { increment: decimalAmount } : undefined,
        },
        create: {
          userId,
          currency,
          balance: decimalAmount,
          totalProfit: type === TransactionType.PROFIT_ACCRUAL ? decimalAmount : new Prisma.Decimal(0),
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          currency,
          amount: decimalAmount,
          type,
          status: TxStatus.APPROVED,
          notes,
        },
      });

      return { wallet, transaction };
    });
  }

  /**
   * Atomically debits balance (with overdraft prevention)
   */
  static async debitBalance(
    userId: string,
    currency: string,
    amount: number | string,
    type: TransactionType,
    notes?: string
  ) {
    const decimalAmount = new Prisma.Decimal(amount);

    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency } },
      });

      if (!wallet || wallet.balance.lessThan(decimalAmount)) {
        throw new Error(`Insufficient ${currency} balance for debit.`);
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId_currency: { userId, currency } },
        data: {
          balance: { decrement: decimalAmount },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          currency,
          amount: decimalAmount,
          type,
          status: TxStatus.APPROVED,
          notes,
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }
}
