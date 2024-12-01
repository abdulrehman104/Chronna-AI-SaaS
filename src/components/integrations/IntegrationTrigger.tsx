import { CloudIcon } from "lucide-react";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import { Modal } from "../modal";
import { IntegrationModalBody } from "./integration-modal-body";

type Props = {
  name: "stripe";
  logo: string;
  title: string;
  descrioption: string;
  connections: {
    [key in "stripe"]: boolean;
  };
};

export const IntegrationTrigger = ({
  name,
  logo,
  title,
  descrioption,
  connections,
}: Props) => {
  return (
    <Modal
      title={title}
      type="Integration"
      logo={logo}
      description={descrioption}
      trigger={
        <Card className="px-3 py-2 cursor-pointer flex items-center gap-2">
          <CloudIcon />
          {connections[name] ? "connected" : "connect"}
        </Card>
      }
    >
      <Separator orientation="horizontal" />
      <IntegrationModalBody connections={connections} type={name} />
    </Modal>
  );
};
