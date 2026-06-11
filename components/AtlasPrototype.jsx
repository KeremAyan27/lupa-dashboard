"use client";
import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, ReferenceDot,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, Bell, Package, Wallet, LayoutGrid, BarChart3,
  AlertTriangle, CheckCircle2, Info, Truck, UserCog, Send, Crown, ArrowUpRight,
  ArrowDownRight, X, Activity, ChevronLeft, Zap,
} from "lucide-react";

/* ───────────────  THEME (dark, mobile-first)  ─────────────── */
const C = {
  bg: "#0A0E14", panel: "#11161F", panel2: "#161C28", line: "#202838",
  text: "#E6EBF2", sub: "#8A95A8", faint: "#5B6577",
  mint: "#3DDC97", mintDim: "#1E5E45", amber: "#F5B544", red: "#FF6B6B",
  blue: "#5BA8FF", violet: "#B69CFF",
};
const fmtTL = (n) => new Intl.NumberFormat("tr-TR").format(Math.round(n)) + " ₺";

/* ───────────────  MOCK DATA (rapora sadık)  ─────────────── */
// Ciro ≈ 47.7M (rapor §4.3). Anomaliler: Mart −39.5%, Nisan +58.4%, Ekim +23.7%, Black Friday.
const monthly = [
  { m: "Oca", v: 3.60 }, { m: "Şub", v: 4.20 },
  { m: "Mar", v: 2.54, anom: { kind: "down", txt: "Ciro düşüşü −%39,5", sev: "high" } },
  { m: "Nis", v: 4.02, anom: { kind: "up", txt: "V-toparlanma +%58,4", sev: "info" } },
  { m: "May", v: 3.80 }, { m: "Haz", v: 3.90 }, { m: "Tem", v: 3.70 },
  { m: "Ağu", v: 3.60 }, { m: "Eyl", v: 3.80 },
  { m: "Eki", v: 4.70, anom: { kind: "up", txt: "Kampanya +%23,7", sev: "info" } },
  { m: "Kas", v: 5.90, anom: { kind: "up", txt: "Black Friday +%40", sev: "info" } },
  { m: "Ara", v: 3.90 },
];
// 30 günlük günlük ciro (dashboard mini trend), bin ₺
const daily30 = Array.from({ length: 30 }, (_, i) => ({
  d: i + 1, v: Math.round(128 + 26 * Math.sin(i / 3.2) + (i > 18 ? (i - 18) * 1.8 : 0)),
}));
const categories = [
  { name: "Elektronik", share: 41, color: C.mint },
  { name: "Giyim", share: 22, color: C.blue },
  { name: "Ev & Yaşam", share: 18, color: C.violet },
  { name: "Kozmetik", share: 12, color: C.amber },
  { name: "Spor", share: 7, color: C.faint },
];
const cities = [
  { name: "İstanbul", v: 14.2 }, { name: "Ankara", v: 7.8 }, { name: "İzmir", v: 5.1 },
  { name: "Bursa", v: 3.4 }, { name: "Antalya", v: 2.9 }, { name: "Diğer (19 şehir)", v: 14.3 },
];
const products = [
  { id: "P0023", name: "Akıllı Telefon Pro 256GB", cat: "Elektronik", price: 24990, stock: 4, crit: 20, sup: "Tedarikçi B" },
  { id: "P0007", name: "Kablosuz Kulaklık ANC", cat: "Elektronik", price: 3499, stock: 9, crit: 25, sup: "Tedarikçi A" },
  { id: "P0031", name: "Koşu Ayakkabısı Air", cat: "Spor", price: 2199, stock: 7, crit: 15, sup: "Tedarikçi D" },
  { id: "P0042", name: "Nemlendirici Serum 50ml", cat: "Kozmetik", price: 749, stock: 11, crit: 30, sup: "Tedarikçi C" },
  { id: "P0015", name: "Akıllı Saat GPS", cat: "Elektronik", price: 5499, stock: 14, crit: 20, sup: "Tedarikçi B" },
  { id: "P0004", name: "Pamuklu Oversize T-Shirt", cat: "Giyim", price: 399, stock: 240, crit: 40, sup: "Tedarikçi E" },
  { id: "P0019", name: "Robot Süpürge Lidar", cat: "Ev & Yaşam", price: 8990, stock: 63, crit: 15, sup: "Tedarikçi A" },
];
const overdue = [
  { id: "PAY000412", cust: "Mavi Perakende A.Ş.", amount: 48750, days: 17 },
  { id: "PAY000388", cust: "Ahmet Yılmaz", amount: 31200, days: 24 },
  { id: "PAY000351", cust: "Deniz Ticaret Ltd.", amount: 27840, days: 31 },
  { id: "PAY000297", cust: "Selin Kaya", amount: 18914, days: 12 },
  { id: "PAY000270", cust: "Eren İnşaat", amount: 13000, days: 9 },
];

const SEV = {
  high: { c: C.red, bg: "rgba(255,107,107,.12)", label: "Yüksek" },
  medium: { c: C.amber, bg: "rgba(245,181,68,.12)", label: "Orta" },
  low: { c: C.blue, bg: "rgba(91,168,255,.12)", label: "Düşük" },
  info: { c: C.mint, bg: "rgba(61,220,151,.12)", label: "Bilgi" },
};
// 9 alert (rapor §4.1) — detayında otomatik tespit notu + etkilenen bağlam + önerilen aksiyon (§7.2/9)
const ALERTS = [
  { id: "A1", type: "revenue_drop", sev: "high", title: "Mart Ciro Düşüşü", msg: "Mart cirosu Şubat'a göre %39,5 geriledi.", ts: "01.03.2025",
    detect: "Sistem, aylık ciroda eşik üstü (%30+) düşüş tespit etti.", ctx: "Etkilenen: Elektronik (−%52), Giyim (−%21).",
    actions: ["Tedarikçiden Sipariş Ver"], rec: "Elektronik kategorisinde stok ve fiyatlandırmayı gözden geçir." },
  { id: "A2", type: "stock_critical", sev: "high", title: "Kritik Stok Seviyesi", msg: "5 ürün kritik eşiğin altında.", ts: "01.12.2025",
    detect: "stockLevel < criticalStock olan 5 ürün bulundu.", ctx: "En acil: Akıllı Telefon Pro (4/20).",
    actions: ["Tedarikçiden Sipariş Ver", "Stok Sorumlusuna Bildir"], rec: "İlgili tedarikçilere acil sipariş aç." },
  { id: "A3", type: "payment_overdue", sev: "medium", title: "Geciken Tahsilat", msg: "12 ödeme vadesi geçti · 139.704 ₺.", ts: "28.11.2025",
    detect: "dueDate geçmiş, status=overdue 12 kayıt.", ctx: "En yüksek: Mavi Perakende (48.750 ₺, 17 gün).",
    actions: ["Hatırlatma Gönder", "Tahsilat Ekibine İlet"], rec: "Vadesi 30+ gün geçenlere öncelik ver." },
  { id: "A4", type: "campaign_success", sev: "info", title: "Ekim Kampanya Başarısı", msg: "Ekim cirosu %23,7 arttı.", ts: "01.11.2025",
    detect: "Aylık ciroda pozitif eşik üstü artış.", ctx: "Sürükleyici: Elektronik & Ev kategorileri.",
    actions: ["Raporu Paylaş"], rec: "Benzer kampanyayı Q1'de tekrarla." },
  { id: "A5", type: "segment_growth", sev: "low", title: "VIP Segment Büyümesi", msg: "VIP oranı %12'ye ulaştı (24 müşteri).", ts: "20.11.2025",
    detect: "VIP segment müşteri sayısı artış trendinde.", ctx: "VIP ort. harcama, normalin ~1,6 katı.",
    actions: ["CRM Ekibine İlet"], rec: "VIP'lere özel sadakat programı değerlendir." },
  { id: "A6", type: "revenue_drop", sev: "info", title: "Nisan V-Toparlanması", msg: "Nisan cirosu Mart'a göre %58,4 arttı.", ts: "01.05.2025",
    detect: "Düşüş sonrası pozitif trend tespit edildi.", ctx: "Toparlanma tüm kategorilere yayıldı.",
    actions: ["Raporu Paylaş"], rec: "Toparlanma sürücülerini analiz et." },
  { id: "A7", type: "stock_critical", sev: "medium", title: "Stok Hareket Anomalisi", msg: "Spor kategorisinde hızlı stok erimesi.", ts: "10.11.2025",
    detect: "Çıkış hızı, giriş hızını 3x aştı.", ctx: "Koşu Ayakkabısı Air (7/15).",
    actions: ["Tedarikçiden Sipariş Ver"], rec: "Tedarik sıklığını artır." },
  { id: "A8", type: "payment_overdue", sev: "low", title: "Yaklaşan Vade", msg: "8 ödeme 7 gün içinde vade dolduruyor.", ts: "25.11.2025",
    detect: "dueDate − bugün ≤ 7 gün.", ctx: "Toplam 64.200 ₺.",
    actions: ["Hatırlatma Gönder"], rec: "Proaktif hatırlatma planla." },
  { id: "A9", type: "campaign_success", sev: "info", title: "Black Friday Zirvesi", msg: "Kasım, yılın en yüksek cirosu.", ts: "30.11.2025",
    detect: "Aylık ciro tarihsel maksimuma ulaştı.", ctx: "5,9M ₺ tek aylık ciro.",
    actions: ["Raporu Paylaş"], rec: "Lojistik kapasiteyi gelecek yıl için ölçekle." },
];
const QA_ICON = { "Tedarikçiden Sipariş Ver": Truck, "Stok Sorumlusuna Bildir": UserCog,
  "Hatırlatma Gönder": Send, "Tahsilat Ekibine İlet": UserCog, "Raporu Paylaş": Send,
  "CRM Ekibine İlet": UserCog };

/* ───────────────  UI HELPERS  ─────────────── */
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, ...style }}>{children}</div>
);
const Pill = ({ color, bg, children }) => (
  <span style={{ color, background: bg, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>{children}</span>
);
const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 12.5, color: C.sub, margin: "2px 2px 0" }}>{children}</div>
);

/* ───────────────  TAB 1 · DASHBOARD (rapor §7.2/01-02)  ─────────────── */
function Dashboard({ go }) {
  const kpis = [
    { key: "ciro", label: "Toplam Ciro", val: "47,7M ₺", chg: "+%4,2", up: true, tap: true },
    { key: "cr", label: "Conversion Rate", val: "%3,2", chg: "+%0,3", up: true },
    { key: "roi", label: "ROI", val: "%124", chg: "+%8", up: true },
    { key: "growth", label: "Büyüme Oranı", val: "−%2,4", chg: "−%2,4", up: false },
  ];
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {kpis.map((k) => (
          <Card key={k.key} onClick={k.tap ? () => go("sales") : undefined}
            style={{ padding: 14, cursor: k.tap ? "pointer" : "default", borderColor: k.key === "growth" ? C.red + "44" : C.line }}>
            <div style={{ color: C.sub, fontSize: 11.5, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 21, fontWeight: 700, fontFamily: "Sora,sans-serif", letterSpacing: -.5, color: k.key === "growth" ? C.red : C.text }}>{k.val}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, color: k.up ? C.mint : C.red, fontSize: 11 }}>
              {k.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{k.chg}
              <span style={{ color: C.faint, marginLeft: 2 }}>· önceki dönem</span>
            </div>
            {k.tap && <div style={{ fontSize: 10, color: C.mint, marginTop: 6 }}>detay için dokun →</div>}
          </Card>
        ))}
      </div>

      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Son 30 Gün · Ciro Trendi</span>
          <span style={{ fontSize: 11, color: C.faint }}>bin ₺</span>
        </div>
        <div style={{ height: 130, margin: "0 -8px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily30} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.mint} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.mint} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fill: C.faint, fontSize: 9 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: C.faint, fontSize: 9 }} axisLine={false} tickLine={false} width={34} />
              <Area type="monotone" dataKey="v" stroke={C.mint} strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ───────────────  TAB 2 · SATIŞ (rapor §7.2/03-05)  ─────────────── */
function Sales() {
  const [range, setRange] = useState(12);      // 3 / 6 / 12 ay filtresi
  const [sel, setSel] = useState(2);           // dokun-odaklan
  const data = useMemo(() => monthly.slice(12 - range), [range]);
  const selClamped = Math.min(sel, data.length - 1);
  const point = data[selClamped];
  const prev = selClamped > 0 ? data[selClamped - 1] : null;
  const pct = prev ? ((point.v - prev.v) / prev.v) * 100 : 0;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* zaman filtresi */}
      <div style={{ display: "flex", gap: 8 }}>
        {[{ l: "Son 3 Ay", v: 3 }, { l: "Son 6 Ay", v: 6 }, { l: "12 Ay", v: 12 }].map((r) => (
          <button key={r.v} onClick={() => { setRange(r.v); setSel(0); }}
            style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: "8px 0", borderRadius: 10, cursor: "pointer",
              color: range === r.v ? C.bg : C.sub, background: range === r.v ? C.mint : "transparent",
              border: `1px solid ${range === r.v ? C.mint : C.line}` }}>{r.l}</button>
        ))}
      </div>

      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Aylık Ciro</span>
          <span style={{ fontSize: 10.5, color: C.faint }}>noktaya dokun →</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 25, fontWeight: 700, fontFamily: "Sora,sans-serif" }}>{point.v.toFixed(2)}M ₺</span>
          {prev && <span style={{ fontSize: 13, fontWeight: 600, color: pct >= 0 ? C.mint : C.red }}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}% · {point.m}</span>}
        </div>
        <div style={{ height: 158, margin: "0 -6px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} onClick={(e) => e && e.activeTooltipIndex != null && setSel(e.activeTooltipIndex)}
              margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="m" tick={{ fill: C.faint, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fill: C.faint, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Line type="monotone" dataKey="v" stroke={C.mint} strokeWidth={2.4}
                dot={{ r: 2.5, fill: C.bg, stroke: C.mint, strokeWidth: 1.5 }} activeDot={{ r: 5, fill: C.mint }} />
              <ReferenceDot x={point.m} y={point.v} r={6} fill={C.text} stroke={C.mint} strokeWidth={2} />
              {data.filter((d) => d.anom).map((d) => (
                <ReferenceDot key={d.m} x={d.m} y={d.v} r={3.5} fill={d.anom.kind === "down" ? C.red : C.amber} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {point.anom ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: SEV[point.anom.sev].bg, padding: "8px 10px", borderRadius: 12 }}>
            {point.anom.kind === "down" ? <TrendingDown size={15} color={C.red} /> : <TrendingUp size={15} color={C.amber} />}
            <span style={{ fontSize: 12 }}>{point.anom.txt}</span>
          </div>
        ) : <div style={{ fontSize: 11.5, color: C.faint }}>Bu ay için anomali yok.</div>}
      </Card>

      {/* kategori pasta (rapor: pasta grafiği) */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>Kategori Dağılımı</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 120, height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories} dataKey="share" nameKey="name" innerRadius={32} outerRadius={56} paddingAngle={2} stroke="none">
                  {categories.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1 }}>
            {categories.map((c) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, marginBottom: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color }} />
                <span style={{ color: C.sub, flex: 1 }}>{c.name}</span>
                <span style={{ fontWeight: 600 }}>%{c.share}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* şehir sıralaması */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>Şehir Bazlı Ciro (M ₺)</div>
        {cities.map((c) => (
          <div key={c.name} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: C.sub }}>{c.name}</span><span style={{ fontWeight: 600 }}>{c.v}</span>
            </div>
            <div style={{ height: 6, background: C.panel2, borderRadius: 999 }}>
              <div style={{ width: `${(c.v / 14.3) * 100}%`, height: "100%", background: C.blue, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ───────────────  TAB 3 · STOK (rapor §7.2/06)  ─────────────── */
function Stock({ toast }) {
  const critical = products.filter((p) => p.stock < p.crit);
  const ordered = [...products].sort((a, b) => a.stock / a.crit - b.stock / b.crit);
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ padding: 14, background: "rgba(255,107,107,.08)", borderColor: C.red + "44" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <AlertTriangle size={18} color={C.red} />
          <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{critical.length} ürün kritik eşiğin altında</div>
            <div style={{ fontSize: 11.5, color: C.sub }}>Acil yeniden sipariş önerilir</div></div>
        </div>
      </Card>
      {ordered.map((p) => {
        const crit = p.stock < p.crit;
        const ratio = Math.min(p.stock / p.crit, 1.5);
        return (
          <Card key={p.id} style={{ padding: 14, borderColor: crit ? C.red + "44" : C.line }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{p.id} · {p.cat} · {p.sup}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "Sora,sans-serif", whiteSpace: "nowrap" }}>{fmtTL(p.price)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <div style={{ flex: 1, height: 6, background: C.panel2, borderRadius: 999 }}>
                <div style={{ width: `${(ratio / 1.5) * 100}%`, height: "100%", background: crit ? C.red : C.mint, borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 11.5, color: crit ? C.red : C.sub, fontWeight: 600 }}>{p.stock}/{p.crit}</span>
            </div>
            {crit && (
              <button onClick={() => toast(`✓ ${p.name} için ${p.sup}'ye sipariş açıldı`)}
                style={{ marginTop: 11, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  fontSize: 12, fontWeight: 600, color: C.bg, background: C.mint, border: "none", padding: 9, borderRadius: 11, cursor: "pointer" }}>
                <Truck size={14} /> Tedarikçiden Sipariş Ver
              </button>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ───────────────  TAB 4 · TAHSİLAT (rapor §7.2/07)  ─────────────── */
function Payments({ toast }) {
  const stats = [{ label: "Tahsil edilen", val: "~4.500", c: C.mint }, { label: "Bekleyen", val: "~147", c: C.amber }, { label: "Gecikmiş", val: "12", c: C.red }];
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: C.sub }}>Gecikmiş tahsilat (toplam alacak)</div>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Sora,sans-serif", margin: "4px 0 14px" }}>139.704 ₺</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: C.panel2, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.c, fontFamily: "Sora,sans-serif" }}>{s.val}</div>
              <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>
      <SectionTitle>Vadesi geçen ödemeler</SectionTitle>
      {overdue.map((o) => (
        <Card key={o.id} style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.cust}</div>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{o.id}</div></div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "Sora,sans-serif" }}>{fmtTL(o.amount)}</div>
              <span style={{ fontSize: 10.5, color: C.red }}>{o.days} gün gecikme</span></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
            <button onClick={() => toast(`✓ ${o.cust}'ye hatırlatma gönderildi`)}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11.5, fontWeight: 600,
                color: C.bg, background: C.mint, border: "none", padding: 8, borderRadius: 10, cursor: "pointer" }}><Send size={13} /> Hatırlatma</button>
            <button onClick={() => toast("✓ Tahsilat ekibine iletildi")}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11.5, fontWeight: 600,
                color: C.text, background: "transparent", border: `1px solid ${C.line}`, padding: 8, borderRadius: 10, cursor: "pointer" }}><UserCog size={13} /> Ekibe İlet</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ───────────────  ALERT CENTER (çan → drawer, rapor §6.1 + §7.2/08-10)  ─────────────── */
function AlertDrawer({ alerts, setAlerts, onClose, toast }) {
  const [openId, setOpenId] = useState(null);
  const detail = alerts.find((a) => a.id === openId);
  const markRead = (id) => setAlerts((s) => s.map((a) => (a.id === id ? { ...a, read: true } : a)));

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 40, display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderTop: `1px solid ${C.line}`, borderRadius: "22px 22px 42px 42px", width: "100%", maxHeight: "82%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 16px 10px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.line}` }}>
          {detail && <ChevronLeft size={20} color={C.sub} style={{ cursor: "pointer" }} onClick={() => setOpenId(null)} />}
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "Sora,sans-serif", flex: 1 }}>{detail ? "Uyarı Detayı" : "Uyarı Merkezi"}</span>
          <X size={20} color={C.sub} style={{ cursor: "pointer" }} onClick={onClose} />
        </div>

        <div className="scroll" style={{ overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {!detail && alerts.map((a) => {
            const sev = SEV[a.sev];
            return (
              <Card key={a.id} onClick={() => setOpenId(a.id)} style={{ padding: 13, cursor: "pointer", opacity: a.read ? 0.6 : 1, borderColor: a.read ? C.line : sev.c + "55" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: sev.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {a.sev === "high" ? <AlertTriangle size={15} color={sev.c} /> : a.type === "campaign_success" ? <CheckCircle2 size={15} color={sev.c} /> : a.type === "segment_growth" ? <Crown size={15} color={sev.c} /> : <Bell size={15} color={sev.c} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</span>
                      {!a.read && <span style={{ width: 7, height: 7, borderRadius: 999, background: sev.c, marginTop: 5 }} />}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3 }}>{a.msg}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 7 }}>
                      <Pill color={sev.c} bg={sev.bg}>{sev.label}</Pill>
                      <span style={{ fontSize: 10.5, color: C.faint }}>{a.ts}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {detail && (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Pill color={SEV[detail.sev].c} bg={SEV[detail.sev].bg}>{SEV[detail.sev].label} önem</Pill>
                <span style={{ fontSize: 11, color: C.faint }}>{detail.ts}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Sora,sans-serif" }}>{detail.title}</div>
              <Card style={{ padding: 13 }}>
                <div style={{ fontSize: 11, color: C.faint, marginBottom: 4 }}>OTOMATİK TESPİT NOTU</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{detail.detect}</div>
              </Card>
              <Card style={{ padding: 13 }}>
                <div style={{ fontSize: 11, color: C.faint, marginBottom: 4 }}>ETKİLENEN BAĞLAM</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{detail.ctx}</div>
              </Card>
              <Card style={{ padding: 13, borderColor: C.mintDim }}>
                <div style={{ fontSize: 11, color: C.mint, marginBottom: 4 }}>ÖNERİLEN AKSİYON</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{detail.rec}</div>
              </Card>
              {/* Quick actions (feedback) */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {detail.actions.map((label, i) => {
                  const Icon = QA_ICON[label] || Zap;
                  return (
                    <button key={label} onClick={() => { toast(`✓ ${label}`); markRead(detail.id); }}
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600,
                        color: i === 0 ? C.bg : C.text, background: i === 0 ? C.mint : "transparent",
                        border: i === 0 ? "none" : `1px solid ${C.line}`, padding: "8px 12px", borderRadius: 10, cursor: "pointer" }}>
                      <Icon size={13} />{label}</button>
                  );
                })}
              </div>
              {/* §7.2/10: Görüldü + Pazarlamaya ilet */}
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button onClick={() => { markRead(detail.id); toast("✓ Görüldü olarak işaretlendi"); setOpenId(null); }}
                  style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text, background: C.panel2, border: `1px solid ${C.line}`, padding: 10, borderRadius: 11, cursor: "pointer" }}>Görüldü İşaretle</button>
                <button onClick={() => { markRead(detail.id); toast("✓ Pazarlama ekibine iletildi"); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 600, color: C.bg, background: C.blue, border: "none", padding: 10, borderRadius: 11, cursor: "pointer" }}><Send size={13} /> Pazarlamaya İlet</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────  SHELL · 4 tab + üst bar çan  ─────────────── */
const TABS = [
  { key: "home", label: "Ana", icon: LayoutGrid },
  { key: "sales", label: "Satış", icon: BarChart3 },
  { key: "stock", label: "Stok", icon: Package },
  { key: "payments", label: "Tahsilat", icon: Wallet },
];
const TITLES = { home: "Genel Bakış", sales: "Satış Analizi", stock: "Stok Durumu", payments: "Tahsilat" };

export default function App() {
  const [tab, setTab] = useState("home");
  const [alerts, setAlerts] = useState(ALERTS.map((a) => ({ ...a, read: a.sev === "info" && a.id === "A4" })));
  const [drawer, setDrawer] = useState(false);
  const [info, setInfo] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => { setToastMsg(m); clearTimeout(window.__t); window.__t = setTimeout(() => setToastMsg(null), 1800); };
  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div style={{ background: "#05070B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 12px", fontFamily: "Manrope,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700&display=swap');
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box} .scroll::-webkit-scrollbar{display:none}`}</style>

      <div style={{ width: 390, maxWidth: "100%", height: 800, maxHeight: "92vh", background: C.bg, borderRadius: 42, border: `1px solid ${C.line}`,
        boxShadow: "0 40px 120px rgba(0,0,0,.6)", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column", color: C.text }}>
        <div style={{ position: "absolute", top: -120, right: -80, width: 260, height: 260, background: "radial-gradient(circle, rgba(61,220,151,.16), transparent 70%)", pointerEvents: "none" }} />

        {/* TOP BAR — çan ikonu burada (rapor: tüm sayfalarda sabit) */}
        <div style={{ padding: "18px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: C.mint, display: "flex", alignItems: "center", justifyContent: "center" }}><Activity size={14} color={C.bg} /></div>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "Sora,sans-serif" }}>Atlas</span>
              <span style={{ fontSize: 9.5, color: C.faint, border: `1px solid ${C.line}`, padding: "1px 6px", borderRadius: 6 }}>DEMO</span>
            </div>
            <div style={{ fontSize: 11.5, color: C.faint, marginTop: 5 }}>{TITLES[tab]}</div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <button onClick={() => setInfo(true)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub }}><Info size={19} /></button>
            <button onClick={() => setDrawer(true)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.text, position: "relative" }}>
              <Bell size={20} />
              {unread > 0 && <span style={{ position: "absolute", top: -5, right: -6, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 999, background: C.red, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>}
            </button>
          </div>
        </div>

        <div className="scroll" style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1, paddingBottom: 8 }}>
          {tab === "home" && <Dashboard go={setTab} />}
          {tab === "sales" && <Sales />}
          {tab === "stock" && <Stock toast={toast} />}
          {tab === "payments" && <Payments toast={toast} />}
        </div>

        {toastMsg && (
          <div style={{ position: "absolute", bottom: 84, left: 16, right: 16, background: C.panel2, border: `1px solid ${C.mintDim}`, borderRadius: 13, padding: "11px 14px", fontSize: 12.5, textAlign: "center", zIndex: 50, boxShadow: "0 8px 30px rgba(0,0,0,.5)" }}>{toastMsg}</div>
        )}

        {drawer && <AlertDrawer alerts={alerts} setAlerts={setAlerts} onClose={() => setDrawer(false)} toast={toast} />}

        {info && (
          <div onClick={() => setInfo(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 45, display: "flex", alignItems: "flex-end" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: C.panel, borderTop: `1px solid ${C.line}`, borderRadius: "22px 22px 42px 42px", padding: 20, width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "Sora,sans-serif" }}>Hakkında & Kısıtlar</span>
                <X size={20} color={C.sub} onClick={() => setInfo(false)} style={{ cursor: "pointer" }} />
              </div>
              <p style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6, margin: 0 }}>
                Mock JSON verisi (Python, <code style={{ color: C.mint }}>random.seed(42)</code> · ~5.005 sipariş, 50 ürün, 200 müşteri).
                KPI'lar §4.3 formülleriyle hesaplanır. Üretimde canlı <b style={{ color: C.text }}>ERP/CRM</b> API'lerine bağlanacaktır.
                Anomaliler (Mart −%39,5, Nisan +%58,4) karar destek senaryoları için bilinçli enjekte edilmiştir.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {["Next.js 14", "TypeScript", "Recharts", "PWA", "Vercel", "TR ₺ · DD.MM.YYYY"].map((t) => (
                  <span key={t} style={{ fontSize: 10.5, color: C.sub, border: `1px solid ${C.line}`, padding: "4px 9px", borderRadius: 8 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAV — 4 sekme (rapor §6.1) */}
        <div style={{ display: "flex", borderTop: `1px solid ${C.line}`, background: "rgba(10,14,20,.9)", backdropFilter: "blur(10px)", padding: "8px 4px 10px", position: "relative", zIndex: 2 }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <t.icon size={21} color={active ? C.mint : C.faint} strokeWidth={active ? 2.4 : 2} />
                <span style={{ fontSize: 10, color: active ? C.mint : C.faint, fontWeight: active ? 600 : 500 }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
