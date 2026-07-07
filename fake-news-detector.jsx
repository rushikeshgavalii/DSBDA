import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0a0a0f",
  panel: "#111118",
  border: "#1e1e2e",
  accent: "#ff3c5f",
  safe: "#00e5a0",
  warn: "#ffb800",
  text: "#e8e8f0",
  muted: "#5a5a7a",
  purple: "#7c3aed",
  blue: "#2563eb",
};

const SAMPLE_ARTICLES = [
  "Scientists discover miracle cure for all diseases using household bleach — doctors hate this one trick!",
  "NASA confirms moon landing was filmed in Hollywood studio, secret documents leaked",
  "According to WHO report, global vaccination rates have increased by 12% in 2024, reducing measles cases significantly.",
  "Local government approves $2.4M budget for new city infrastructure including road repairs and park upgrades.",
  "BREAKING: 5G towers proven to control human minds, whistleblower reveals secret government program",
];

const CredibilityBar = ({ score }) => {
  const color = score >= 70 ? COLORS.safe : score >= 40 ? COLORS.warn : COLORS.accent;
  return (
    <div style={{ width: "100%", background: "#1a1a2e", borderRadius: 8, height: 10, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${score}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 8,
          transition: "width 1s cubic-bezier(.4,0,.2,1)",
          boxShadow: `0 0 12px ${color}66`,
        }}
      />
    </div>
  );
};

const RadarChart = ({ scores }) => {
  const size = 180;
  const cx = size / 2, cy = size / 2, r = 65;
  const labels = ["Factual", "Neutral", "Sources", "Logic", "Consistency"];
  const pts = labels.map((_, i) => {
    const angle = (i / labels.length) * 2 * Math.PI - Math.PI / 2;
    const val = (scores[i] || 50) / 100;
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle), lx: cx + (r + 24) * Math.cos(angle), ly: cy + (r + 24) * Math.sin(angle) };
  });
  const polygon = pts.map(p => `${p.x},${p.y}`).join(" ");
  const gridLevels = [0.25, 0.5, 0.75, 1];
  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {gridLevels.map(lv => {
        const gpts = labels.map((_, i) => {
          const angle = (i / labels.length) * 2 * Math.PI - Math.PI / 2;
          return `${cx + r * lv * Math.cos(angle)},${cy + r * lv * Math.sin(angle)}`;
        }).join(" ");
        return <polygon key={lv} points={gpts} fill="none" stroke="#1e1e3e" strokeWidth={1} />;
      })}
      {labels.map((_, i) => {
        const angle = (i / labels.length) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="#1e1e3e" strokeWidth={1} />;
      })}
      <polygon points={polygon} fill="#ff3c5f22" stroke={COLORS.accent} strokeWidth={2} />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={COLORS.accent} />
      ))}
      {pts.map((p, i) => (
        <text key={i} x={p.lx} y={p.ly + 4} textAnchor="middle" fill={COLORS.muted} fontSize={9} fontFamily="monospace">{labels[i]}</text>
      ))}
    </svg>
  );
};

const StatCard = ({ label, value, color, icon }) => (
  <div style={{
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "14px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  }}>
    <div style={{ fontSize: 20, color }}>{icon}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "monospace", letterSpacing: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 2 }}>{label}</div>
  </div>
);

const TagBadge = ({ text, type }) => {
  const colors = { fake: COLORS.accent, suspicious: COLORS.warn, real: COLORS.safe };
  const c = colors[type] || COLORS.muted;
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontFamily: "monospace",
      fontWeight: 700,
      background: `${c}22`,
      color: c,
      border: `1px solid ${c}55`,
      letterSpacing: 1,
      textTransform: "uppercase",
    }}>{text}</span>
  );
};

export default function FakeNewsDetector() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("detector");
  const [glitch, setGlitch] = useState(false);
  const textareaRef = useRef();

  const triggerGlitch = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 600);
  };

  const analyzeNews = async () => {
    if (!input.trim()) return;
    setLoading(true);
    triggerGlitch();
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a fake news detection system with advanced data analytics. Analyze news text and return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "verdict": "FAKE" | "SUSPICIOUS" | "CREDIBLE",
  "credibilityScore": 0-100,
  "radarScores": [factual_0-100, neutral_0-100, sources_0-100, logic_0-100, consistency_0-100],
  "redFlags": ["flag1", "flag2"],
  "positives": ["positive1"],
  "summary": "2-sentence plain-English analysis",
  "biasType": "none" | "political" | "sensational" | "commercial" | "emotional",
  "emotionScore": 0-100,
  "clickbaitScore": 0-100,
  "sourceReliability": "unknown" | "low" | "medium" | "high"
}`,
          messages: [{ role: "user", content: `Analyze this news content: "${input}"` }],
        }),
      });
      const data = await response.json();
      const text = data.content?.map(b => b.text || "").join("") || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const entry = { ...parsed, text: input.slice(0, 80) + (input.length > 80 ? "…" : ""), timestamp: new Date() };
      setResult(entry);
      setHistory(prev => [entry, ...prev].slice(0, 20));
    } catch (e) {
      setResult({ verdict: "ERROR", credibilityScore: 0, summary: "Analysis failed. Please try again.", radarScores: [0,0,0,0,0], redFlags: [], positives: [], biasType: "none", emotionScore: 0, clickbaitScore: 0, sourceReliability: "unknown" });
    }
    setLoading(false);
  };

  const verdictConfig = {
    FAKE: { color: COLORS.accent, label: "⚠ FAKE NEWS DETECTED", bg: "#ff3c5f15" },
    SUSPICIOUS: { color: COLORS.warn, label: "⚡ SUSPICIOUS CONTENT", bg: "#ffb80015" },
    CREDIBLE: { color: COLORS.safe, label: "✓ CREDIBLE CONTENT", bg: "#00e5a015" },
    ERROR: { color: COLORS.muted, label: "⊘ ANALYSIS ERROR", bg: "#5a5a7a15" },
  };

  // Analytics derived from history
  const totalAnalyzed = history.length;
  const fakeCount = history.filter(h => h.verdict === "FAKE").length;
  const credibleCount = history.filter(h => h.verdict === "CREDIBLE").length;
  const avgCredibility = history.length ? Math.round(history.reduce((a, b) => a + (b.credibilityScore || 0), 0) / history.length) : 0;
  const biasBreakdown = history.reduce((acc, h) => { acc[h.biasType || "none"] = (acc[h.biasType || "none"] || 0) + 1; return acc; }, {});

  const styles = {
    container: {
      minHeight: "100vh",
      background: COLORS.bg,
      color: COLORS.text,
      fontFamily: "'Courier New', monospace",
      padding: "0",
      position: "relative",
      overflow: "hidden",
    },
    header: {
      borderBottom: `1px solid ${COLORS.border}`,
      padding: "20px 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: `linear-gradient(90deg, ${COLORS.panel}, ${COLORS.bg})`,
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    logo: {
      fontSize: 22,
      fontWeight: 900,
      letterSpacing: 3,
      color: COLORS.text,
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    logoAccent: { color: COLORS.accent },
    nav: { display: "flex", gap: 4 },
    navBtn: (active) => ({
      padding: "7px 18px",
      borderRadius: 8,
      border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
      background: active ? `${COLORS.accent}20` : "transparent",
      color: active ? COLORS.accent : COLORS.muted,
      cursor: "pointer",
      fontFamily: "monospace",
      fontSize: 12,
      letterSpacing: 2,
      textTransform: "uppercase",
      transition: "all 0.2s",
    }),
    main: { maxWidth: 960, margin: "0 auto", padding: "32px 24px" },
    card: {
      background: COLORS.panel,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
    },
    textarea: {
      width: "100%",
      minHeight: 120,
      background: "#0d0d1a",
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      color: COLORS.text,
      fontFamily: "monospace",
      fontSize: 14,
      padding: "14px 16px",
      resize: "vertical",
      outline: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      transition: "border-color 0.2s",
    },
    analyzeBtn: {
      width: "100%",
      padding: "14px",
      background: loading ? "#1a1a2e" : `linear-gradient(135deg, ${COLORS.accent}, #c0295e)`,
      border: "none",
      borderRadius: 10,
      color: loading ? COLORS.muted : "#fff",
      fontFamily: "monospace",
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: 3,
      cursor: loading ? "not-allowed" : "pointer",
      marginTop: 12,
      transition: "all 0.3s",
      textTransform: "uppercase",
    },
    sampleBtn: {
      padding: "5px 14px",
      background: "transparent",
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      color: COLORS.muted,
      fontSize: 11,
      fontFamily: "monospace",
      cursor: "pointer",
      transition: "all 0.2s",
      letterSpacing: 1,
    },
  };

  const scanline = {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)",
    pointerEvents: "none",
    zIndex: 9999,
  };

  return (
    <div style={styles.container}>
      <div style={scanline} />

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: -200, left: -200, width: 500, height: 500, borderRadius: "50%", background: `${COLORS.accent}08`, filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: `${COLORS.purple}06`, filter: "blur(100px)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={{ color: COLORS.accent, fontSize: 26 }}>⬡</span>
          TRUTH<span style={styles.logoAccent}>SCAN</span>
          <span style={{ fontSize: 10, color: COLORS.muted, fontWeight: 400, letterSpacing: 1, marginLeft: 8 }}>v2.0 / AI ANALYTICS</span>
        </div>
        <div style={styles.nav}>
          {["detector", "analytics", "history"].map(tab => (
            <button key={tab} style={styles.navBtn(activeTab === tab)} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.main}>

        {/* DETECTOR TAB */}
        {activeTab === "detector" && (
          <>
            {/* Input Card */}
            <div style={styles.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: COLORS.muted, letterSpacing: 2, textTransform: "uppercase" }}>
                  // PASTE NEWS ARTICLE OR HEADLINE
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {SAMPLE_ARTICLES.map((s, i) => (
                    <button key={i} style={styles.sampleBtn} onClick={() => setInput(s)} title={s}>
                      #{i + 1}
                    </button>
                  ))}
                  <span style={{ fontSize: 11, color: COLORS.muted, alignSelf: "center", marginLeft: 4 }}>samples</span>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                style={styles.textarea}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Paste any news headline, article excerpt, or social media post here for instant AI-powered analysis..."
                onFocus={e => e.target.style.borderColor = COLORS.accent}
                onBlur={e => e.target.style.borderColor = COLORS.border}
              />
              <button style={styles.analyzeBtn} onClick={analyzeNews} disabled={loading || !input.trim()}>
                {loading ? "◌  SCANNING FOR DECEPTION..." : "⬡  ANALYZE FOR FAKE NEWS"}
              </button>
            </div>

            {/* Result */}
            {result && (() => {
              const vc = verdictConfig[result.verdict] || verdictConfig.ERROR;
              return (
                <div style={{ ...styles.card, border: `1px solid ${vc.color}44`, background: vc.bg, animation: "fadeIn 0.4s ease" }}>
                  <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }`}</style>

                  {/* Verdict Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: vc.color, letterSpacing: 3 }}>{vc.label}</div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: vc.color, fontFamily: "monospace" }}>
                      {result.credibilityScore}<span style={{ fontSize: 14, opacity: 0.6 }}>/100</span>
                    </div>
                  </div>

                  {/* Credibility Bar */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: COLORS.muted, letterSpacing: 2 }}>
                      <span>CREDIBILITY SCORE</span>
                      <span>{result.credibilityScore}%</span>
                    </div>
                    <CredibilityBar score={result.credibilityScore} />
                  </div>

                  {/* Stats Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                    <StatCard label="Emotion Level" value={`${result.emotionScore}%`} color={result.emotionScore > 60 ? COLORS.accent : COLORS.safe} icon="🧠" />
                    <StatCard label="Clickbait Score" value={`${result.clickbaitScore}%`} color={result.clickbaitScore > 60 ? COLORS.accent : COLORS.safe} icon="⚡" />
                    <StatCard label="Source Trust" value={result.sourceReliability?.toUpperCase() || "—"} color={result.sourceReliability === "high" ? COLORS.safe : result.sourceReliability === "medium" ? COLORS.warn : COLORS.accent} icon="🔗" />
                  </div>

                  {/* Radar + Details */}
                  <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, alignItems: "start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <RadarChart scores={result.radarScores || [50, 50, 50, 50, 50]} />
                      <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 2, marginTop: 4 }}>SIGNAL ANALYSIS</div>
                    </div>
                    <div>
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>// Summary</div>
                        <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, background: "#0d0d1a", borderRadius: 8, padding: "10px 14px" }}>{result.summary}</div>
                      </div>

                      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                        {result.biasType && result.biasType !== "none" && <TagBadge text={`${result.biasType} bias`} type="suspicious" />}
                        <TagBadge text={result.verdict?.toLowerCase()} type={result.verdict === "FAKE" ? "fake" : result.verdict === "CREDIBLE" ? "real" : "suspicious"} />
                        <TagBadge text={`${result.sourceReliability} reliability`} type={result.sourceReliability === "high" ? "real" : result.sourceReliability === "low" ? "fake" : "suspicious"} />
                      </div>

                      {result.redFlags?.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, color: COLORS.accent, letterSpacing: 2, marginBottom: 6 }}>⚑ RED FLAGS</div>
                          {result.redFlags.map((f, i) => (
                            <div key={i} style={{ fontSize: 12, color: "#ff6b6b", padding: "3px 0 3px 12px", borderLeft: `2px solid ${COLORS.accent}66` }}>— {f}</div>
                          ))}
                        </div>
                      )}
                      {result.positives?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, color: COLORS.safe, letterSpacing: 2, marginBottom: 6 }}>✓ POSITIVES</div>
                          {result.positives.map((p, i) => (
                            <div key={i} style={{ fontSize: 12, color: COLORS.safe, padding: "3px 0 3px 12px", borderLeft: `2px solid ${COLORS.safe}66` }}>+ {p}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div>
            <div style={{ fontSize: 13, color: COLORS.muted, letterSpacing: 3, marginBottom: 20, textTransform: "uppercase" }}>
              // DATA ANALYTICS DASHBOARD — {totalAnalyzed} ARTICLES ANALYZED
            </div>

            {totalAnalyzed === 0 ? (
              <div style={{ ...styles.card, textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>◌</div>
                <div style={{ color: COLORS.muted, letterSpacing: 2 }}>NO DATA YET — ANALYZE SOME NEWS FIRST</div>
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  <StatCard label="Total Analyzed" value={totalAnalyzed} color={COLORS.blue} icon="📊" />
                  <StatCard label="Fake Detected" value={fakeCount} color={COLORS.accent} icon="🚨" />
                  <StatCard label="Credible News" value={credibleCount} color={COLORS.safe} icon="✓" />
                  <StatCard label="Avg Credibility" value={`${avgCredibility}%`} color={COLORS.warn} icon="⬡" />
                </div>

                {/* Verdict Distribution */}
                <div style={{ ...styles.card, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>// Verdict Distribution</div>
                  {["FAKE", "SUSPICIOUS", "CREDIBLE"].map(v => {
                    const count = history.filter(h => h.verdict === v).length;
                    const pct = totalAnalyzed ? Math.round((count / totalAnalyzed) * 100) : 0;
                    const colors = { FAKE: COLORS.accent, SUSPICIOUS: COLORS.warn, CREDIBLE: COLORS.safe };
                    return (
                      <div key={v} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                          <span style={{ color: colors[v], letterSpacing: 2 }}>{v}</span>
                          <span style={{ color: COLORS.muted }}>{count} articles ({pct}%)</span>
                        </div>
                        <CredibilityBar score={pct} />
                      </div>
                    );
                  })}
                </div>

                {/* Bias Breakdown */}
                <div style={{ ...styles.card, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>// Bias Type Breakdown</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {Object.entries(biasBreakdown).map(([type, count]) => (
                      <div key={type} style={{ background: "#0d0d1a", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 18px", textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.warn, fontFamily: "monospace" }}>{count}</div>
                        <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 2, textTransform: "uppercase" }}>{type}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Credibility Timeline */}
                <div style={styles.card}>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>// Credibility Score Timeline</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                    {[...history].reverse().slice(0, 20).map((h, i) => {
                      const color = h.credibilityScore >= 70 ? COLORS.safe : h.credibilityScore >= 40 ? COLORS.warn : COLORS.accent;
                      return (
                        <div key={i} title={`${h.credibilityScore}% — ${h.verdict}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "default" }}>
                          <div style={{ width: "100%", background: `${color}88`, borderRadius: "4px 4px 0 0", height: `${h.credibilityScore * 0.8}px`, transition: "height 0.5s", boxShadow: `0 0 8px ${color}44` }} />
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: color }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 2, marginTop: 8 }}>LAST {Math.min(history.length, 20)} ANALYSES (OLDEST → NEWEST)</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div>
            <div style={{ fontSize: 13, color: COLORS.muted, letterSpacing: 3, marginBottom: 20, textTransform: "uppercase" }}>
              // ANALYSIS HISTORY — {history.length} RECORDS
            </div>
            {history.length === 0 ? (
              <div style={{ ...styles.card, textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>◌</div>
                <div style={{ color: COLORS.muted, letterSpacing: 2 }}>NO HISTORY YET</div>
              </div>
            ) : (
              history.map((h, i) => {
                const vc = verdictConfig[h.verdict] || verdictConfig.ERROR;
                return (
                  <div key={i} style={{ ...styles.card, borderLeft: `3px solid ${vc.color}`, marginBottom: 10, padding: "14px 18px", cursor: "pointer" }}
                    onClick={() => { setInput(h.text); setResult(h); setActiveTab("detector"); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, marginRight: 16 }}>
                        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 4, lineHeight: 1.5 }}>{h.text}</div>
                        <div style={{ fontSize: 10, color: COLORS.muted }}>{h.timestamp?.toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 80 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: vc.color, fontFamily: "monospace" }}>{h.credibilityScore}%</div>
                        <div style={{ fontSize: 10, color: vc.color, letterSpacing: 1 }}>{h.verdict}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
