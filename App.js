import { useState, useRef, useCallback, useEffect } from "react";

const INITIAL_POSTS = [
  { id: 1, user: "Sakura_Wine", avatar: "S", wine: "Château Pétrus 2015", note: "信じられないほど複雑な味わい。カシスと黒トリュフの香りが絡み合い、タンニンは絹のように滑らか。", likes: 142, time: "2時間前", color: "#722F37" },
  { id: 2, user: "Yuki_Sommelier", avatar: "Y", wine: "Opus One 2019", note: "ブラックチェリーとタバコのノート。長い余韻が続く。今夜のディナーに最高の一本でした。", likes: 89, time: "5時間前", color: "#4A0E0E" },
  { id: 3, user: "Hiroshi_Cellar", avatar: "H", wine: "Barolo Riserva 2016", note: "バラとドライフルーツの香り。酸味と渋みのバランスが完璧。10年熟成の価値あり。", likes: 203, time: "昨日", color: "#8B1A1A" },
  { id: 4, user: "Mei_Bordeaux", avatar: "M", wine: "Château Lafite 2012", note: "スモーキーなアロマに黒スグリとシダーのニュアンス。構造感のある骨格が印象的。", likes: 315, time: "2日前", color: "#5C1010" },
];

const TASTE_TAGS = ["フルボディ", "ミディアムボディ", "ライトボディ", "タンニン豊か", "タンニン柔らか", "フルーティ", "スパイシー", "ミネラル感", "長い余韻", "短い余韻", "エレガント", "力強い", "繊細", "複雑", "フレッシュ", "酸味豊か", "まろやか", "辛口", "甘口", "クリーミー", "爽やか", "凝縮感"];

const FLAVOR_CATEGORIES = [
  {
    label: "🍇 赤系果実",
    notes: ["ブラックチェリー", "レッドチェリー", "カシス", "ブルーベリー", "ラズベリー", "ストロベリー", "プラム", "ザクロ", "クランベリー"]
  },
  {
    label: "🍋 柑橘・白系果実",
    notes: ["レモン", "ライム", "グレープフルーツ", "オレンジピール", "白桃", "黄桃", "アプリコット", "洋梨", "青リンゴ", "メロン", "マンゴー", "パイナップル", "パッションフルーツ", "グアバ", "ライチ"]
  },
  {
    label: "🌸 花",
    notes: ["バラ", "スミレ", "ジャスミン", "アカシア", "オレンジの花", "ラベンダー", "白い花", "花蜜", "桜"]
  },
  {
    label: "🌿 ハーブ・植物",
    notes: ["ミント", "ハーブ", "緑茶", "芝草", "ユーカリ", "タイム", "フェンネル", "白コショウ", "黒コショウ", "アニス"]
  },
  {
    label: "🍄 大地・スパイス",
    notes: ["スモーク", "土", "革", "トリュフ", "きのこ", "シダー", "タバコ", "チョコレート", "コーヒー", "シナモン", "クローブ", "甘草"]
  },
  {
    label: "🪵 樽・熟成",
    notes: ["オーク", "バニラ", "バター", "トースト", "ナッツ", "アーモンド", "ヘーゼルナッツ", "蜂蜜", "キャラメル", "クリーム"]
  },
  {
    label: "🪨 ミネラル",
    notes: ["火打石", "石灰岩", "塩味", "鉄分", "ヨード", "海風", "白チョーク"]
  }
];

const C = {
  bg: "#0D0705", card: "#160B0B", card2: "#1E0E0E",
  burgundy: "#722F37", gold: "#C5A028",
  text: "#F5ECD7", muted: "#7A5A50", dim: "#3A2020",
};

async function analyzeWineLabel(base64Image, mediaType) {
  const response = await fetch("https://wine-app-vtrj.onrender.com/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Image, mediaType })
  });
  if (!response.ok) throw new Error("API error");
  return await response.json();
}

const wineColorHex = (color) => {
  const map = { red: "#722F37", white: "#8B7340", "rose": "#C47A7A", sparkling: "#7A6B30", dessert: "#8B5A00" };
  return map[color] || "#722F37";
};

export default function WineApp() {
  const [activeTab, setActiveTab] = useState("scan");
  const [scannedWine, setScannedWine] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [tasting, setTasting] = useState({ rating: 0, notes: "", tags: [], flavors: [] });
  const [savedWines, setSavedWines] = useState([]);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [toast, setToast] = useState("");
  const [likedPosts, setLikedPosts] = useState({});
  const [hoveredStar, setHoveredStar] = useState(0);
  const [following, setFollowing] = useState({});
  const [selectedWine, setSelectedWine] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setUploadedImage(dataUrl);
      setIsScanning(true);
      setScannedWine(null);
      setScanError(null);
      setTasting({ rating: 0, notes: "", tags: [], flavors: [] });
      try {
        const [meta, base64] = dataUrl.split(",");
        const mediaType = meta.match(/:(.*?);/)[1];
        const wine = await analyzeWineLabel(base64, mediaType);
        wine.colorHex = wineColorHex(wine.color);
        setScannedWine(wine);
      } catch (err) {
        setScanError("ラベルの読み取りに失敗しました。もう一度お試しください。");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const toggleTag = (tag, type) => {
    if (type === "tag") setTasting(t => ({ ...t, tags: t.tags.includes(tag) ? t.tags.filter(x => x !== tag) : [...t.tags, tag] }));
    else setTasting(t => ({ ...t, flavors: t.flavors.includes(tag) ? t.flavors.filter(x => x !== tag) : [...t.flavors, tag] }));
  };

  const saveTasting = () => {
    if (!scannedWine) return;
    setSavedWines(prev => [{ ...scannedWine, tasting: { ...tasting }, image: uploadedImage, savedAt: new Date().toLocaleDateString("ja-JP") }, ...prev]);
    showToast("セラーに保存しました 🍷");
  };

  const shareToFeed = () => {
    if (!scannedWine) return;
    const label = [scannedWine.name, scannedWine.vintage].filter(Boolean).join(" ");
    setPosts(prev => [{ id: Date.now(), user: "あなた", avatar: "あ", wine: label, note: tasting.notes || `${scannedWine.name}を堪能しました。`, likes: 0, time: "今", color: scannedWine.colorHex }, ...prev]);
    showToast("コミュニティに投稿しました ✨");
    setTimeout(() => setActiveTab("community"), 700);
  };

  const toggleLike = (id) => {
    setLikedPosts(prev => ({ ...prev, [id]: !prev[id] }));
    setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + (likedPosts[id] ? -1 : 1) } : p));
  };

  const tabs = [
    { id: "scan", label: "スキャン", icon: "◎" },
    { id: "cellar", label: "マイセラー", icon: "▣" },
    { id: "community", label: "コミュニティ", icon: "◈" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Georgia', serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #722F37; border-radius: 2px; }
        .fade { animation: fadeUp .45s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }
        .slide { animation: slideUp .45s cubic-bezier(.22,1,.36,1); }
        @keyframes slideUp { from{opacity:0;transform:translateY(22px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)} }
        .ring { animation: ring 2s ease-in-out infinite; }
        @keyframes ring { 0%,100%{box-shadow:0 0 0 0 rgba(114,47,55,.7)}50%{box-shadow:0 0 0 18px rgba(114,47,55,0)} }
        .scan-bar { animation: scanBar 1.8s ease-in-out infinite; }
        @keyframes scanBar { 0%{top:0;opacity:1}100%{top:100%;opacity:0} }
        .shimmer { background:linear-gradient(90deg,#1a0808 25%,#2d1212 50%,#1a0808 75%);background-size:200% 100%;animation:sh 1.4s infinite linear; }
        @keyframes sh { 0%{background-position:200% 0}100%{background-position:-200% 0} }
        .toast-in { animation: ti .4s cubic-bezier(.22,1,.36,1); }
        @keyframes ti { from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .pill { cursor:pointer; transition:all .18s; user-select:none; }
        .pill:hover { transform:scale(1.05); }
        .pill:active { transform:scale(.96); }
        .upload { transition:all .25s; cursor:pointer; }
        .upload:hover { border-color:#C5A028 !important; background:rgba(197,160,40,.04) !important; }
        .heart { cursor:pointer; transition:transform .15s; }
        .heart:active { transform:scale(1.4); }
        .follow-b { cursor:pointer; transition:all .2s; }
        .follow-b:hover { opacity:.8; }
        .cellar-card { cursor:pointer; transition:transform .2s,box-shadow .2s; }
        .cellar-card:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(0,0,0,.4); }
        .star { cursor:pointer; transition:transform .12s; }
        .star:hover { transform:scale(1.2); }
        .btn { cursor:pointer; transition:all .2s; border:none; }
        .btn:hover { opacity:.85; transform:translateY(-1px); }
        input[type=file] { display:none; }
        textarea { resize:none; outline:none; }
        textarea:focus { border-color:#C5A028 !important; }
        .nav-link { cursor:pointer; transition:color .25s,border-color .25s; background:none; border:none; }
        .nav-link:hover { color:#C5A028 !important; }
        .confidence-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:10px; font-family:'Cormorant Garamond',serif; }
        @media (min-width: 768px) {
          .app-layout { flex-direction: row !important; }
          .sidebar { display: flex !important; flex-direction: column; width: 240px; min-height: 100vh; position: sticky; top: 0; height: 100vh; overflow-y: auto; border-right: 1px solid rgba(197,160,40,.12); padding: 36px 24px; flex-shrink: 0; background: linear-gradient(180deg,#1C0808 0%,#0D0705 100%); }
          .mobile-header { display: none !important; }
          .main-scroll { padding: 36px 40px !important; max-width: 900px; }
          .pc-two-col { display: grid !important; grid-template-columns: 1fr 1fr; gap: 24px; }
          .community-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        }
        @media (max-width: 767px) {
          .sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .main-scroll { padding: 16px 14px 100px !important; }
          .pc-two-col { display: block !important; }
          .community-grid { display: flex; flex-direction: column; gap: 14px; }
        }
      `}</style>

      {toast && (
        <div className="toast-in" style={{ position: "fixed", bottom: isMobile ? 90 : 32, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#2D1010,#1A0808)", border: `1px solid ${C.gold}`, color: C.gold, padding: "10px 24px", borderRadius: 40, fontSize: 13, fontFamily: "'Cormorant Garamond',serif", zIndex: 999, boxShadow: "0 8px 32px rgba(0,0,0,.6)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      <div className="app-layout" style={{ display: "flex", flex: 1 }}>
        <div className="sidebar">
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 36, color: C.gold, lineHeight: 1 }}>Vin</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 5, textTransform: "uppercase", marginTop: 4 }}>Wine Journal</div>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tabs.map(tab => (
              <button key={tab.id} className="nav-link" onClick={() => setActiveTab(tab.id)}
                style={{ padding: "12px 16px", borderRadius: 10, textAlign: "left", color: activeTab === tab.id ? C.gold : C.muted, background: activeTab === tab.id ? "rgba(197,160,40,0.08)" : "none", fontSize: 14, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1, display: "flex", alignItems: "center", gap: 12, borderLeft: `2px solid ${activeTab === tab.id ? C.gold : "transparent"}` }}>
                <span style={{ fontSize: 18 }}>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </nav>
          <div style={{ marginTop: "auto", paddingTop: 32, borderTop: "1px solid rgba(197,160,40,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: C.gold }}>{savedWines.length}</div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2 }}>セラー</div>
              </div>
              <div style={{ width: 1, background: "rgba(197,160,40,0.15)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: C.gold }}>{posts.length}</div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2 }}>投稿</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", textAlign: "center" }}>"In vino veritas"</div>
          </div>
        </div>

        <div className="mobile-header" style={{ background: "linear-gradient(180deg,#1C0808,#0D0705)", padding: "18px 16px 0", borderBottom: "1px solid rgba(197,160,40,0.12)", position: "sticky", top: 0, zIndex: 100, flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 28, color: C.gold, lineHeight: 1 }}>Vin</div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 4, textTransform: "uppercase" }}>Wine Journal</div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.gold }}>{savedWines.length}</div><div style={{ fontSize: 9, color: C.muted }}>セラー</div></div>
              <div style={{ width: 1, background: "rgba(197,160,40,.2)" }} />
              <div style={{ textAlign: "center" }}><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.gold }}>{posts.length}</div><div style={{ fontSize: 9, color: C.muted }}>投稿</div></div>
            </div>
          </div>
          <div style={{ display: "flex" }}>
            {tabs.map(tab => (
              <button key={tab.id} className="nav-link" onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "10px 4px 12px", color: activeTab === tab.id ? C.gold : C.muted, borderBottom: `2px solid ${activeTab === tab.id ? C.gold : "transparent"}`, fontSize: 11, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 15 }}>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="main-scroll" style={{ flex: 1, padding: "16px 14px 100px", overflowY: "auto" }}>
          {!isMobile && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 28, color: C.gold }}>
                {activeTab === "scan" && "Label Scanner"}{activeTab === "cellar" && "My Cellar"}{activeTab === "community" && "Community"}
              </div>
              <div style={{ fontSize: 13, color: C.muted, fontFamily: "'Cormorant Garamond',serif", marginTop: 4 }}>
                {activeTab === "scan" && "AIがラベルを読み取り、ワイン情報を正確に識別します"}
                {activeTab === "cellar" && "あなたのワインコレクション"}
                {activeTab === "community" && "ワイン愛好家とつながる"}
              </div>
            </div>
          )}

          {activeTab === "scan" && (
            <div className="fade">
              {isMobile && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 20, color: C.gold }}>Label Scanner</div>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: "'Cormorant Garamond',serif" }}>AIがラベルを読み取り、正確に識別します</div>
                </div>
              )}
              <div className="pc-two-col">
                <div>
                  <div className="upload" onClick={() => fileInputRef.current?.click()}
                    style={{ border: `1.5px dashed ${uploadedImage ? "rgba(197,160,40,.4)" : C.burgundy}`, borderRadius: 14, overflow: "hidden", marginBottom: 20, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: "rgba(114,47,55,.05)" }}>
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
                    {isScanning && uploadedImage && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(13,7,5,.6)", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                        <div className="ring" style={{ width: 60, height: 60, borderRadius: "50%", border: `2px solid ${C.burgundy}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔍</div>
                        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 15, color: C.gold, letterSpacing: 2 }}>AIが解析中...</div>
                        <div className="scan-bar" style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, pointerEvents: "none" }} />
                      </div>
                    )}
                    {uploadedImage ? (
                      <div style={{ width: "100%", position: "relative" }}>
                        <img src={uploadedImage} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 50%,rgba(13,7,5,.9))" }} />
                        {!isScanning && <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 11, color: C.gold, background: "rgba(0,0,0,.7)", padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(197,160,40,.3)", fontFamily: "'Cormorant Garamond',serif" }}>タップで変更</div>}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: 36 }}>
                        <div style={{ fontSize: 54, marginBottom: 14 }}>🍷</div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: C.gold, marginBottom: 8 }}>写真をアップロード</div>
                        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>AIがラベルを読み取り<br />ワイン情報を自動識別</div>
                      </div>
                    )}
                  </div>
                  {scanError && (
                    <div style={{ background: "rgba(114,47,55,.15)", border: "1px solid rgba(114,47,55,.4)", borderRadius: 12, padding: 16, marginBottom: 16, color: "#E8A0A0", fontSize: 13, fontFamily: "'Cormorant Garamond',serif" }}>
                      ⚠️ {scanError}
                    </div>
                  )}
                  {scannedWine && !isScanning && (
                    <div className="slide" style={{ background: `linear-gradient(135deg,${C.card2},#1A0A0A)`, borderRadius: 16, padding: 20, border: "1px solid rgba(197,160,40,.2)", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 0, right: 0, width: 130, height: 130, background: `radial-gradient(circle,${scannedWine.colorHex}35 0%,transparent 70%)`, pointerEvents: "none" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: C.gold, letterSpacing: 3, fontFamily: "'Cormorant Garamond',serif" }}>✦ AI識別結果 ✦</div>
                        {scannedWine.confidence && (
                          <span className="confidence-badge" style={{ background: scannedWine.confidence === "high" ? "rgba(50,120,50,.2)" : scannedWine.confidence === "medium" ? "rgba(120,100,20,.2)" : "rgba(120,50,50,.2)", border: `1px solid ${scannedWine.confidence === "high" ? "rgba(80,180,80,.4)" : scannedWine.confidence === "medium" ? "rgba(180,150,30,.4)" : "rgba(180,80,80,.4)"}`, color: scannedWine.confidence === "high" ? "#80E080" : scannedWine.confidence === "medium" ? "#D4B840" : "#E08080" }}>
                            {scannedWine.confidence === "high" ? "✓ 高精度" : scannedWine.confidence === "medium" ? "△ 中精度" : "▲ 低精度"}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 14 }}>
                        <div style={{ width: 58, height: 80, borderRadius: 10, background: `linear-gradient(160deg,${scannedWine.colorHex},#1a0505)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: "1px solid rgba(197,160,40,.2)", boxShadow: `0 4px 20px ${scannedWine.colorHex}50` }}>
                          {scannedWine.color === "white" ? "🥂" : scannedWine.color === "sparkling" ? "🍾" : scannedWine.color === "rose" ? "🌸" : "🍷"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, color: C.text, lineHeight: 1.2, marginBottom: 4 }}>{scannedWine.name}</div>
                          {scannedWine.vintage && <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, color: C.gold, marginBottom: 8 }}>{scannedWine.vintage}</div>}
                          {scannedWine.producer && <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>🏰 {scannedWine.producer}</div>}
                          {scannedWine.region && <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>📍 {scannedWine.region}</div>}
                          {scannedWine.appellation && <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>🏷 {scannedWine.appellation}</div>}
                          {scannedWine.grape && <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>🍇 {scannedWine.grape}</div>}
                          {scannedWine.alcohol && <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>🍶 アルコール {scannedWine.alcohol}</div>}
                          {scannedWine.description && <div style={{ fontSize: 12, color: "#B5A090", fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", lineHeight: 1.65 }}>{scannedWine.description}</div>}
                        </div>
                      </div>
                      {scannedWine.rating && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(197,160,40,.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 11, color: C.muted }}>推定スコア</div>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: C.gold }}>{scannedWine.rating}<span style={{ fontSize: 12 }}> pts</span></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {scannedWine && !isScanning && (
                  <div className="slide">
                    <div style={{ background: C.card, borderRadius: 14, padding: 18, marginBottom: 14, border: "1px solid rgba(255,255,255,.04)" }}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1 }}>あなたの評価</div>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        {[1,2,3,4,5].map(s => (
                          <div key={s} className="star" onMouseEnter={() => setHoveredStar(s)} onMouseLeave={() => setHoveredStar(0)} onClick={() => setTasting(t => ({ ...t, rating: s }))}>
                            <span style={{ fontSize: 30, color: s <= (hoveredStar || tasting.rating) ? C.gold : C.dim, textShadow: s <= (hoveredStar || tasting.rating) ? `0 0 12px ${C.gold}80` : "none", display: "block" }}>★</span>
                          </div>
                        ))}
                      </div>
                      {tasting.rating > 0 && <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: C.gold, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic" }}>{["","物足りない","まあまあ","良い","とても良い","素晴らしい！"][tasting.rating]}</div>}
                    </div>
                    <div style={{ background: C.card, borderRadius: 14, padding: 18, marginBottom: 14, border: "1px solid rgba(255,255,255,.04)" }}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1 }}>スタイル</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                        {TASTE_TAGS.map(tag => (
                          <span key={tag} className="pill" onClick={() => toggleTag(tag, "tag")} style={{ padding: "5px 13px", borderRadius: 20, fontSize: 11, fontFamily: "'Cormorant Garamond',serif", border: `1px solid ${tasting.tags.includes(tag) ? C.gold : C.dim}`, background: tasting.tags.includes(tag) ? "rgba(197,160,40,.15)" : "transparent", color: tasting.tags.includes(tag) ? C.gold : C.muted }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1 }}>香りと風味</div>
                      {FLAVOR_CATEGORIES.map(cat => (
                        <div key={cat.label} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, color: C.gold, marginBottom: 6, fontFamily: "'Cormorant Garamond',serif", opacity: 0.8 }}>{cat.label}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {cat.notes.map(tag => (
                              <span key={tag} className="pill" onClick={() => toggleTag(tag, "flavor")} style={{ padding: "4px 11px", borderRadius: 20, fontSize: 11, fontFamily: "'Cormorant Garamond',serif", border: `1px solid ${tasting.flavors.includes(tag) ? C.burgundy : C.dim}`, background: tasting.flavors.includes(tag) ? "rgba(114,47,55,.2)" : "transparent", color: tasting.flavors.includes(tag) ? "#E8A0A0" : C.muted }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: C.card, borderRadius: 14, padding: 18, marginBottom: 18, border: "1px solid rgba(255,255,255,.04)" }}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1 }}>感想・テイスティングメモ</div>
                      <textarea value={tasting.notes} onChange={e => setTasting(t => ({ ...t, notes: e.target.value }))} placeholder="このワインの印象、ペアリング、思い出を記録しましょう..."
                        style={{ width: "100%", minHeight: 90, background: "rgba(255,255,255,.03)", border: `1px solid ${C.dim}`, borderRadius: 10, padding: 14, color: C.text, fontSize: 13, fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.7 }} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn" onClick={saveTasting} style={{ flex: 1, padding: "14px 0", background: `linear-gradient(135deg,${C.burgundy},#5C1515)`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1, boxShadow: `0 4px 20px ${C.burgundy}50` }}>
                        🍷 セラーに保存
                      </button>
                      <button className="btn" onClick={shareToFeed} style={{ flex: 1, padding: "14px 0", background: "linear-gradient(135deg,#2A1A00,#3D2600)", border: `1px solid ${C.gold}50`, borderRadius: 12, color: C.gold, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1 }}>
                        ✨ 投稿する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "cellar" && (
            <div className="fade">
              {isMobile && <div style={{ marginBottom: 20 }}><div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 20, color: C.gold }}>My Cellar</div><div style={{ fontSize: 12, color: C.muted, fontFamily: "'Cormorant Garamond',serif" }}>あなたのワインコレクション</div></div>}
              {selectedWine ? (
                <div className="slide">
                  <button onClick={() => setSelectedWine(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, fontFamily: "'Cormorant Garamond',serif", cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>← 一覧に戻る</button>
                  <div style={{ maxWidth: 600, background: `linear-gradient(135deg,${C.card2},#1A0A0A)`, borderRadius: 16, padding: 28, border: "1px solid rgba(197,160,40,.2)" }}>
                    {selectedWine.image && <img src={selectedWine.image} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 10, marginBottom: 20 }} />}
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: C.text, marginBottom: 6 }}>{selectedWine.name}</div>
                    <div style={{ color: C.gold, fontSize: 16, fontFamily: "'Cormorant Garamond',serif", marginBottom: 10 }}>{selectedWine.vintage}</div>
                    {selectedWine.producer && <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>🏰 {selectedWine.producer}</div>}
                    {selectedWine.region && <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>📍 {selectedWine.region}</div>}
                    {selectedWine.grape && <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>🍇 {selectedWine.grape}</div>}
                    {selectedWine.description && <div style={{ fontSize: 13, color: "#B5A090", fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", lineHeight: 1.65, marginBottom: 16 }}>{selectedWine.description}</div>}
                    {selectedWine.tasting.rating > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>あなたの評価</div><div style={{ display: "flex", gap: 4 }}>{[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 22, color: s <= selectedWine.tasting.rating ? C.gold : C.dim }}>★</span>)}</div></div>}
                    {selectedWine.tasting.tags.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>{selectedWine.tasting.tags.map(t => <span key={t} style={{ padding: "3px 11px", borderRadius: 20, fontSize: 11, border: `1px solid ${C.gold}40`, color: C.gold, fontFamily: "'Cormorant Garamond',serif" }}>{t}</span>)}</div>}
                    {selectedWine.tasting.notes && <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 10, padding: 16, border: `1px solid ${C.dim}`, marginBottom: 14 }}><div style={{ fontSize: 13, color: "#B5A090", fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", lineHeight: 1.7 }}>{selectedWine.tasting.notes}</div></div>}
                    <div style={{ fontSize: 11, color: C.muted }}>保存日: {selectedWine.savedAt}</div>
                  </div>
                </div>
              ) : savedWines.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 20px" }}>
                  <div style={{ fontSize: 60, marginBottom: 20, opacity: .2 }}>🍾</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 22, color: C.muted, marginBottom: 10 }}>セラーが空です</div>
                  <div style={{ fontSize: 14, color: "#4A3030", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.8, marginBottom: 28 }}>スキャンタブからワインを<br />追加してみましょう</div>
                  <button className="btn" onClick={() => setActiveTab("scan")} style={{ padding: "12px 32px", background: `linear-gradient(135deg,${C.burgundy},#5C1515)`, borderRadius: 30, color: C.text, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1 }}>スキャンする →</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
                  {savedWines.map((wine, i) => (
                    <div key={i} className="cellar-card" onClick={() => setSelectedWine(wine)} style={{ background: `linear-gradient(135deg,${C.card2},#180C0C)`, borderRadius: 14, padding: 16, border: "1px solid rgba(255,255,255,.05)", display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ width: 52, height: 70, borderRadius: 8, background: `linear-gradient(160deg,${wine.colorHex || C.burgundy},#1a0505)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: "1px solid rgba(197,160,40,.15)", overflow: "hidden" }}>
                        {wine.image ? <img src={wine.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🍷"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wine.name}</div>
                        <div style={{ fontSize: 12, color: C.gold, fontFamily: "'Cormorant Garamond',serif", marginTop: 2 }}>{wine.vintage}{wine.region ? ` · ${wine.region}` : ""}</div>
                        {wine.tasting.rating > 0 && <div style={{ display: "flex", gap: 2, marginTop: 6 }}>{[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 12, color: s <= wine.tasting.rating ? C.gold : C.dim }}>★</span>)}</div>}
                      </div>
                      <div style={{ fontSize: 20, color: C.muted }}>›</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "community" && (
            <div className="fade">
              {isMobile && <div style={{ marginBottom: 20 }}><div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 20, color: C.gold }}>Community</div><div style={{ fontSize: 12, color: C.muted, fontFamily: "'Cormorant Garamond',serif" }}>ワイン愛好家とつながる</div></div>}
              <div className="community-grid">
                {posts.map((post, i) => (
                  <div key={post.id} className="slide" style={{ background: `linear-gradient(135deg,${C.card2},#180C0C)`, borderRadius: 16, padding: 18, border: "1px solid rgba(255,255,255,.05)", animationDelay: `${i * 0.04}s` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg,${post.color || C.burgundy},#1a0505)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontFamily: "'Playfair Display',serif", color: C.text, border: "1px solid rgba(197,160,40,.2)", flexShrink: 0 }}>{post.avatar}</div>
                        <div>
                          <div style={{ fontSize: 13, color: C.text, fontFamily: "'Cormorant Garamond',serif", fontWeight: 500 }}>{post.user}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{post.time}</div>
                        </div>
                      </div>
                      {post.user !== "あなた" && (
                        <button className="follow-b btn" onClick={() => { setFollowing(prev => ({ ...prev, [post.user]: !prev[post.user] })); showToast(following[post.user] ? `${post.user}のフォローを解除` : `${post.user}をフォローしました`); }}
                          style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${following[post.user] ? C.muted : C.gold}`, background: "none", color: following[post.user] ? C.muted : C.gold, fontSize: 11, fontFamily: "'Cormorant Garamond',serif" }}>
                          {following[post.user] ? "フォロー中" : "フォロー"}
                        </button>
                      )}
                    </div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 14, color: C.gold, marginBottom: 8 }}>{post.wine}</div>
                    <div style={{ fontSize: 13, color: "#C0A898", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.75, marginBottom: 14 }}>{post.note}</div>
                    <div style={{ height: 1, background: "rgba(255,255,255,.04)", marginBottom: 12 }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                      <div className="heart" onClick={() => toggleLike(post.id)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 18, color: likedPosts[post.id] ? "#E87070" : C.muted }}>{likedPosts[post.id] ? "♥" : "♡"}</span>
                        <span style={{ fontSize: 12, color: likedPosts[post.id] ? "#E87070" : C.muted, fontFamily: "'Cormorant Garamond',serif" }}>{post.likes}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><span style={{ fontSize: 15, color: C.muted }}>💬</span><span style={{ fontSize: 12, color: C.muted, fontFamily: "'Cormorant Garamond',serif" }}>返信</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><span style={{ fontSize: 14, color: C.muted }}>↗</span><span style={{ fontSize: 12, color: C.muted, fontFamily: "'Cormorant Garamond',serif" }}>シェア</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {isMobile && <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 80, background: `linear-gradient(to top,${C.bg} 60%,transparent)`, pointerEvents: "none" }} />}
    </div>
  );
}
