"use client";
export default function PrintButton() {
  return (
    <button type="button" className="bo-btn is-plain bo-noprint" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
