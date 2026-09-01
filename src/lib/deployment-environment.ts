// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

export const BETA_DEPLOYMENT_ENVIRONMENT = "beta";

type DeploymentEnvironment = Readonly<Record<string, string | undefined>>;

export const isBetaDeployment = (
  environment: DeploymentEnvironment = process.env,
): boolean =>
  environment.LOTTO_DEPLOYMENT_ENVIRONMENT === BETA_DEPLOYMENT_ENVIRONMENT;
