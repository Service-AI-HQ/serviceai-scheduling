import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";

export class OnboardingPathService {
  // Both entry points resolve to the same first step because the plan chooser is
  // skipped on a self-hosted single-practice instance — see onboardingUtils.
  static async getGettingStartedPath(): Promise<string> {
    const featureRepository = getFeatureRepository();
    const onboardingV3Enabled = await featureRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");
    return onboardingV3Enabled ? "/onboarding/personal/settings" : "/getting-started";
  }

  static async getGettingStartedPathWhenInvited(): Promise<string> {
    const featureRepository = getFeatureRepository();
    const onboardingV3Enabled = await featureRepository.checkIfFeatureIsEnabledGlobally("onboarding-v3");
    return onboardingV3Enabled ? "/onboarding/personal/settings" : "/getting-started";
  }

  static async getGettingStartedPathWithParams(queryParams?: Record<string, string>): Promise<string> {
    const basePath = await OnboardingPathService.getGettingStartedPath();

    if (!queryParams || Object.keys(queryParams).length === 0) {
      return basePath;
    }

    const params = new URLSearchParams(queryParams);
    return `${basePath}?${params.toString()}`;
  }
}
