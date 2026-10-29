import Constants from "expo-constants";
import { Linking } from "react-native";
import { t } from "../i18n";
interface Publisher {
  publisher: string;
  privacyPolicyUrl: string;
  supportUrl: string;
}
const configured = Constants.expoConfig?.extra?.store as
  | Partial<Publisher>
  | undefined;
export const publisher: Publisher = {
  publisher: configured?.publisher ?? "",
  privacyPolicyUrl: configured?.privacyPolicyUrl ?? "",
  supportUrl: configured?.supportUrl ?? "",
};
export const appVersion = Constants.expoConfig?.version ?? "1.0.0";
export async function openPublisherLink(
  url: string,
  notify: (message: string) => void,
) {
  if (!url) {
    notify(t("legal.notConfigured"));
    return;
  }
  try {
    if (!/^https:\/\//i.test(url)) throw new Error("Invalid publisher URL");
    await Linking.openURL(url);
  } catch {
    notify(t("legal.openFailed"));
  }
}
