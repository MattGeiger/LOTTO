// SPDX-License-Identifier: AGPL-3.0-or-later
import "server-only";
import { version } from "../../../package.json";
import { resolvePublicStateSnapshotConfig } from "./server-snapshot";
import {
  hashPublicConfiguration, publicConfigurationEnvelopeSchema,
  MAX_CONFIGURATION_BYTES, type PublicConfigurationData,
} from "./public-configuration-protocol";

export const isPublicConfigurationSnapshotEnabled = (): boolean => {
  const flag = process.env.LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED?.trim().toLowerCase();
  if (!flag || flag === "false") return false;
  if (flag !== "true") throw new Error("LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED must be true or false.");
  return true;
};

export const publicConfigurationFailureStatus = (): 500 | 503 => {
  try { return isPublicConfigurationSnapshotEnabled() ? 503 : 500; }
  catch { return 503; } // An invalid gate must not reinstate SQL fallback.
};

export const configurationHubUrl = (action = "configuration"): URL => {
  const config = resolvePublicStateSnapshotConfig({ ...process.env, LOTTO_PUBLIC_STATE_SNAPSHOT_ENABLED: "true" });
  if (!config?.snapshotUrl) throw new Error("Public configuration requires a validated agency hub.");
  const url = new URL(config.snapshotUrl);
  url.pathname = url.pathname.replace(/\/state$/, `/${action}`);
  return url;
};

export async function configurationRequest(action: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(configurationHubUrl(action), {
    ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5_000),
  });
  return response;
}

export async function readPublicConfigurationSnapshot(): Promise<PublicConfigurationData> {
  const response = await configurationRequest("configuration");
  if (!response.ok) throw new Error("Public configuration snapshot is unavailable.");
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_CONFIGURATION_BYTES) throw new Error("Configuration snapshot is too large.");
  const envelope = publicConfigurationEnvelopeSchema.parse(JSON.parse(text));
  const agencyId = configurationHubUrl().pathname.split("/")[3];
  if (envelope.agencyId !== agencyId || envelope.release !== version) {
    throw new Error("Configuration snapshot agency or release does not match.");
  }
  if (await hashPublicConfiguration(envelope.data) !== envelope.checksum) {
    throw new Error("Configuration snapshot checksum does not match.");
  }
  return envelope.data;
}
