"use client";
import { useEffect, useState } from "react";

/** Aviso de éxito que sobrevive a la recarga tras guardar. */
export default function Flash() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    setMsg(sessionStorage.getItem("bo-flash") ?? "");
    sessionStorage.removeItem("bo-flash");
  }, []);
  return (
    <div role="status" className="bo-noprint">
      {msg && <p className="bo-msg is-ok bo-flash">{msg}</p>}
    </div>
  );
}
