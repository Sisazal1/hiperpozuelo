"use client";
import PaymentMarks, { methodNames, usePaymentMethods } from "@/components/orders/PaymentMarks";

export default function OnlineMarks() {
  const m = usePaymentMethods();
  return m ? <PaymentMarks keys={methodNames(m)} /> : null;
}
