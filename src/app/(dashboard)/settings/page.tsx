import { InfoBar } from "@/components/infobar";
import { BillingSettings } from "@/components/settings/billing-settings";
import { ChangePassword } from "@/components/settings/change-password";
import { DarkModetoggle } from "@/components/settings/dark-mode";

export default function SettingPage() {
  return (
    <>
      <InfoBar />
      <div className="overflow-y-auto w-full chat-window flex-1 h-0 flex flex-col gap-10">
        <BillingSettings />
        <ChangePassword />
        <DarkModetoggle />
      </div>
    </>
  );
}