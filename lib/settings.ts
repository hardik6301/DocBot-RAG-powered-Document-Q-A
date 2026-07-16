import { promises as fs } from "fs";
import path from "path";
import { dataDir } from "@/lib/paths";
import { useDurableDb } from "@/lib/config";
import prisma from "@/lib/prisma";

export type UserSettings = {
  isPro: boolean;
  proSince: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

const SETTINGS_FILE = () => path.join(dataDir(), "settings.json");

const DEFAULTS: UserSettings = {
  isPro: false,
  proSince: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
};

async function readLocal(): Promise<UserSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE(), "utf8");
    return { ...DEFAULTS, ...(JSON.parse(raw) as UserSettings) };
  } catch {
    return { ...DEFAULTS };
  }
}

async function writeLocal(next: UserSettings) {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(SETTINGS_FILE(), JSON.stringify(next, null, 2));
  return next;
}

function fromUser(user: {
  isPro: boolean;
  proSince: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}): UserSettings {
  return {
    isPro: user.isPro,
    proSince: user.proSince?.toISOString() ?? null,
    stripeCustomerId: user.stripeCustomerId,
    stripeSubscriptionId: user.stripeSubscriptionId,
  };
}

/** Local JSON settings (no DB). Safe to call from auth. */
export async function getLocalSettings(): Promise<UserSettings> {
  return readLocal();
}

export async function getSettings(userId?: string): Promise<UserSettings> {
  if (useDurableDb()) {
    if (!userId) return { ...DEFAULTS };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { ...DEFAULTS };
    return fromUser(user);
  }
  return readLocal();
}

export async function setPro(
  enabled: boolean,
  userId?: string,
): Promise<UserSettings> {
  if (useDurableDb()) {
    if (!userId) throw new Error("userId required for durable Pro toggle");
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isPro: enabled,
        proSince: enabled ? new Date() : null,
      },
    });
    return fromUser(user);
  }

  const prev = await readLocal();
  return writeLocal({
    ...prev,
    isPro: enabled,
    proSince: enabled ? (prev.proSince ?? new Date().toISOString()) : null,
  });
}

export async function activateProFromStripe(input: {
  customerId: string | null;
  subscriptionId: string | null;
  userId?: string | null;
}): Promise<UserSettings> {
  if (useDurableDb()) {
    let userId = input.userId ?? null;
    if (!userId && input.customerId) {
      const byCustomer = await prisma.user.findFirst({
        where: { stripeCustomerId: input.customerId },
      });
      userId = byCustomer?.id ?? null;
    }
    if (!userId) {
      throw new Error("Cannot activate Pro: user not resolved");
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isPro: true,
        proSince: new Date(),
        stripeCustomerId: input.customerId,
        stripeSubscriptionId: input.subscriptionId,
      },
    });
    return fromUser(user);
  }

  return writeLocal({
    isPro: true,
    proSince: new Date().toISOString(),
    stripeCustomerId: input.customerId,
    stripeSubscriptionId: input.subscriptionId,
  });
}

export async function deactivateProFromStripe(input?: {
  customerId?: string | null;
  userId?: string | null;
}): Promise<UserSettings> {
  if (useDurableDb()) {
    let userId = input?.userId ?? null;
    if (!userId && input?.customerId) {
      const byCustomer = await prisma.user.findFirst({
        where: { stripeCustomerId: input.customerId },
      });
      userId = byCustomer?.id ?? null;
    }
    if (!userId) return { ...DEFAULTS };
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isPro: false,
        proSince: null,
        stripeSubscriptionId: null,
      },
    });
    return fromUser(updated);
  }

  const prev = await readLocal();
  return writeLocal({
    ...prev,
    isPro: false,
    proSince: null,
    stripeSubscriptionId: null,
  });
}
