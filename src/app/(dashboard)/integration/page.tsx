import { onGetPaymentConnected } from "@/actions/settings";
import { InfoBar } from "@/components/infobar";
import { IntegrationsList } from "@/components/integrations";

export default async function IntegrationsPage() {
  const payment = await onGetPaymentConnected();

  const connections = {
    stripe: payment ? true : false,
  };

  return (
    <>
      <InfoBar />
      <IntegrationsList connections={connections} />
    </>
  );
}
