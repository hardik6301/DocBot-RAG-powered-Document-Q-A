import { promises as fs } from "fs";
import path from "path";
import { dataDir } from "@/lib/paths";

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

export async function getSettings(): Promise<UserSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE(), "utf8");
    return { ...DEFAULTS, ...(JSON.parse(raw) as UserSettings) };
  } catch {
    return { ...DEFAULTS };
  }
}

async function writeSettings(next: UserSettings) {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(SETTINGS_FILE(), JSON.stringify(next, null, 2));
  return next;
}

export async function setPro(enabled: boolean): Promise<UserSettings> {
  const prev = await getSettings();
  return writeSettings({
    ...prev,
    isPro: enabled,
    proSince: enabled ? (prev.proSince ?? new Date().toISOString()) : null,
  });
}

export async function activateProFromStripe(input: {
  customerId: string | null;
  subscriptionId: string | null;
}): Promise<UserSettings> {
  return writeSettings({
    isPro: true,
    proSince: new Date().toISOString(),
    stripeCustomerId: input.customerId,
    stripeSubscriptionId: input.subscriptionId,
  });
}

export async function deactivateProFromStripe(): Promise<UserSettings> {
  const prev = await getSettings();
  return writeSettings({
    ...prev,
    isPro: false,
    proSince: null,
    stripeSubscriptionId: null,
  });
}
