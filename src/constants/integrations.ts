type IntegrationsListItemProps = {
  id: string;
  name: "stripe";
  logo: string;
  description: string;
  title: string;
  modalDescription: string;
};

export const INTEGRATION_LIST_ITEMS: IntegrationsListItemProps[] = [
  {
    id: "1",
    name: "stripe",
    description:
      "Stripe is the fastest and easiest way to integrate payments and financial services into your software platform or marketplace.",
    logo: "8d6e32ce-a93f-41ec-99c2-4f0dc5bbc2fd",
    title: "Connect Stripe Account",
    modalDescription:
      "The world’s most successful platforms and marketplaces including Shopify and DoorDash, use Stripe Connect.",
  },
];
