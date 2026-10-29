import React from "react";
import { Screen, Card, Button } from "../src/ui/components";
import { Text } from "../src/ui/text";
import { s } from "../src/ui/theme";
import { t } from "../src/i18n";
import { publisher, openPublisherLink } from "../src/services/publisher";
import { useApp } from "../src/state/AppProvider";
export default function Privacy() {
  const app = useApp();
  return (
    <Screen title={t("legal.privacy")}>
      <Card>
        <Text style={s.body}>{t("legal.body")}</Text>
        {!!publisher.publisher && (
          <Text style={s.label}>{publisher.publisher}</Text>
        )}
        <Button
          title={t("legal.website")}
          variant="secondary"
          onPress={() =>
            void openPublisherLink(publisher.privacyPolicyUrl, app.notify)
          }
        />
        <Button
          title={t("legal.support")}
          variant="ghost"
          onPress={() =>
            void openPublisherLink(publisher.supportUrl, app.notify)
          }
        />
      </Card>
    </Screen>
  );
}
