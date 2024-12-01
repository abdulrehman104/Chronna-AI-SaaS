"use client";

import useAuthContextHook from "@/context/use-auth-context";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { TypeSelectionForm } from "./type-selection-form";
import { Spinner } from "@/components/spinner";
import dynamic from "next/dynamic";

const DetailForm = dynamic(
  () => import("./account-details-form").then((mod) => mod.AccountDetailsForm),
  {
    ssr: false,
    loading: () => <Spinner />,
  }
);

const OTPForm = dynamic(() => import("./otp-form").then((mod) => mod.OTPForm), {
  ssr: false,
  loading: () => <Spinner />,
});

export const RegistrationFormStep = () => {
  const {
    register,
    formState: { errors },
    setValue,
  } = useFormContext();
  const { currentStep } = useAuthContextHook();
  const [onUserType, setOnUserType] = useState<"owner" | "student">("owner");
  const [onOTP, setOnOTP] = useState<string>("");

  setValue("otp", onOTP);

  switch (currentStep) {
    case 1:
      return (
        <TypeSelectionForm
          register={register}
          userType={onUserType}
          setUserType={setOnUserType}
        />
      );
    case 2:
      return <DetailForm errors={errors} register={register} />;
    case 3:
      return <OTPForm onOTP={onOTP} setOTP={setOnOTP} />;
  }

  return <div>RegistrationFormStep</div>;
};
