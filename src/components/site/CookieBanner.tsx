"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function CookieBanner() { const [visible, setVisible] = useState(false); useEffect(() => { setVisible(localStorage.getItem("hp-cookies-ack") !== "1"); }, []); if (!visible) return null; return <aside className="cookie-banner" role="region" aria-label="Información de almacenamiento"><p>Usamos solo almacenamiento técnico para cesta y favoritos. No utilizamos analítica.</p><Link href="/cookies">Más información</Link><button onClick={() => { localStorage.setItem("hp-cookies-ack", "1"); setVisible(false); }}>Entendido</button></aside>; }
