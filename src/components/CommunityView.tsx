"use client";

import { useState } from "react";

/* ── Types ── */
type FeedTab = "feed" | "photos" | "discussions" | "spotting";

interface Post {
  id: string;
  author: string;
  avatar: string;
  handle: string;
  time: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  tags: string[];
  type: "photo" | "discussion" | "spotting" | "news";
  flightTag?: string;
  location?: string;
}

/* ── Mock data ── */
const MOCK_POSTS: Post[] = [
  {
    id: "1", author: "Jessica Chen", avatar: "JC", handle: "@avgeek_jess", time: "12m ago",
    content: "Caught this incredible A350 on short final at LAX today. The wing flex on these birds is just beautiful. 📸✈️",
    image: "sunset-a350", likes: 342, comments: 47, shares: 23, liked: false,
    tags: ["planespotting", "A350", "LAX"], type: "photo", flightTag: "QFA7", location: "Los Angeles, CA",
  },
  {
    id: "2", author: "Marcus Rivera", avatar: "MR", handle: "@atc_marcus", time: "38m ago",
    content: "New RNAV approach procedure for RWY 28R at SFO is live. Pilots, be aware of the updated waypoint sequencing. The BDEGA arrival now has a revised altitude restriction at MENLO.",
    likes: 128, comments: 89, shares: 56, liked: true,
    tags: ["ATC", "SFO", "RNAV"], type: "discussion",
  },
  {
    id: "3", author: "SkyWay Official", avatar: "SW", handle: "@skyway", time: "1h ago",
    content: "🚀 SkyWay v2.0 is here! Real-time 3D globe tracking, live ATC integration, and this amazing community. Welcome aboard, aviation enthusiasts!",
    likes: 1247, comments: 203, shares: 445, liked: false,
    tags: ["SkyWay", "update", "aviation"], type: "news",
  },
  {
    id: "4", author: "David Park", avatar: "DP", handle: "@heavymetal_spotter", time: "2h ago",
    content: "First ever Boeing 777X revenue flight spotted departing KORD! The folding wingtips are wild in person. This is the future of long-haul.",
    image: "777x-takeoff", likes: 892, comments: 156, shares: 234, liked: false,
    tags: ["777X", "Boeing", "ORD", "firstflight"], type: "spotting", flightTag: "UAE235", location: "Chicago, IL",
  },
  {
    id: "5", author: "Captain Sarah Mitchell", avatar: "SM", handle: "@capt_sarah", time: "3h ago",
    content: "Night approach into Hong Kong never gets old. Checkered board memories even though they don't do it anymore. VHHH is still one of the most stunning airports to fly into.",
    image: "hkg-night", likes: 567, comments: 72, shares: 88, liked: true,
    tags: ["pilot", "HKG", "nightflight", "cockpit"], type: "photo", location: "Hong Kong",
  },
  {
    id: "6", author: "AeroTech Weekly", avatar: "AT", handle: "@aerotechweekly", time: "4h ago",
    content: "BREAKING: Airbus confirms A321XLR entry into service with Iberia next month. This changes everything for transatlantic narrowbody ops. Thread 🧵👇",
    likes: 2103, comments: 312, shares: 876, liked: false,
    tags: ["A321XLR", "Airbus", "Iberia", "breaking"], type: "news",
  },
  {
    id: "7", author: "Tokyo Spotter", avatar: "TS", handle: "@nrt_spotter", time: "5h ago",
    content: "ANA's new livery on the 787-10 is absolutely stunning. The gradient from white to blue is so clean. Narita was packed with spotters today.",
    image: "ana-787", likes: 445, comments: 63, shares: 112, liked: false,
    tags: ["ANA", "787", "NRT", "livery", "planespotting"], type: "spotting", flightTag: "ANA12", location: "Narita, Japan",
  },
  {
    id: "8", author: "Mike Thompson", avatar: "MT", handle: "@wx_pilot_mike", time: "6h ago",
    content: "Anyone else seeing the new jetstream pattern pushing ground speeds over 650kts eastbound? My FMS is showing some wild ETAs tonight. TATL routes are going to be interesting this week.",
    likes: 234, comments: 145, shares: 34, liked: false,
    tags: ["weather", "jetstream", "pilotlife"], type: "discussion",
  },
];

/* ── Gradient backgrounds for post images ── */
const IMAGE_GRADIENTS: Record<string, string> = {
  "sunset-a350": "linear-gradient(135deg, #1a0533 0%, #0c2340 30%, #ff6b35 60%, #ffb347 100%)",
  "777x-takeoff": "linear-gradient(135deg, #0c1445 0%, #1a3a5c 40%, #4a90d9 70%, #87ceeb 100%)",
  "hkg-night": "linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 30%, #ffd700 50%, #ff8c00 80%, #0a0a2e 100%)",
  "ana-787": "linear-gradient(135deg, #001f4d 0%, #003380 40%, #e8e8e8 60%, #ffffff 100%)",
};

/* ── Component ── */
export default function CommunityView() {
  const [activeTab, setActiveTab] = useState<FeedTab>("feed");
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [composing, setComposing] = useState(false);
  const [composeText, setComposeText] = useState("");

  const filteredPosts = activeTab === "feed"
    ? posts
    : posts.filter((p) => p.type === activeTab || (activeTab === "photos" && p.image) || (activeTab === "spotting" && p.type === "spotting"));

  const toggleLike = (id: string) => {
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const feedTabs: { id: FeedTab; label: string; icon: string }[] = [
    { id: "feed", label: "For You", icon: "✦" },
    { id: "photos", label: "Photos", icon: "◻" },
    { id: "discussions", label: "Discussions", icon: "◎" },
    { id: "spotting", label: "Spotting", icon: "◈" },
  ];

  return (
    <div className="absolute inset-0 z-10 flex flex-col view-fade-in" style={{ background: "rgba(3, 8, 18, 0.97)", paddingBottom: 72 }}>

      {/* ── Header ── */}
      <div style={{ padding: "16px 20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
            Community
          </h1>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={() => setComposing(!composing)}
              style={{
                background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)",
                color: "#fff", border: "none", borderRadius: 20,
                padding: "8px 18px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", letterSpacing: "0.3px",
                boxShadow: "0 2px 12px rgba(0,180,216,0.3)",
              }}
            >
              + Post
            </button>
          </div>
        </div>

        {/* ── Feed tabs ── */}
        <div style={{ display: "flex", gap: 4 }}>
          {feedTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600,
                color: activeTab === tab.id ? "#00e5ff" : "rgba(255,255,255,0.4)",
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: activeTab === tab.id ? "2px solid #00e5ff" : "2px solid transparent",
                transition: "all 0.2s ease",
                letterSpacing: "0.2px",
              }}
            >
              <span style={{ marginRight: 6, opacity: 0.7 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Compose box ── */}
      {composing && (
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 20,
              background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>
              You
            </div>
            <div style={{ flex: 1 }}>
              <textarea
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                placeholder="Share a spotting, start a discussion, or post a photo..."
                style={{
                  width: "100%", minHeight: 80, background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
                  padding: 12, color: "#fff", fontSize: 14, resize: "vertical",
                  outline: "none", fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <div style={{ display: "flex", gap: 16 }}>
                  {["📸 Photo", "✈️ Tag Flight", "📍 Location", "🏷️ Tags"].map((btn) => (
                    <button key={btn} style={{
                      background: "none", border: "none", color: "rgba(255,255,255,0.35)",
                      fontSize: 12, cursor: "pointer", padding: 0,
                    }}>
                      {btn}
                    </button>
                  ))}
                </div>
                <button style={{
                  background: composeText.trim() ? "linear-gradient(135deg, #00b4d8, #0077b6)" : "rgba(255,255,255,0.1)",
                  color: composeText.trim() ? "#fff" : "rgba(255,255,255,0.3)",
                  border: "none", borderRadius: 16, padding: "8px 20px",
                  fontSize: 13, fontWeight: 600, cursor: composeText.trim() ? "pointer" : "default",
                }}>
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Feed ── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {filteredPosts.map((post) => (
          <article key={post.id} style={{
            padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
            transition: "background 0.15s ease",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ display: "flex", gap: 12 }}>
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                background: post.handle === "@skyway"
                  ? "linear-gradient(135deg, #00e5ff 0%, #0077b6 100%)"
                  : `hsl(${post.id.charCodeAt(0) * 40}, 60%, 35%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 14, fontWeight: 700,
                border: post.handle === "@skyway" ? "2px solid rgba(0,229,255,0.4)" : "none",
              }}>
                {post.avatar}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Author line */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{post.author}</span>
                  {post.handle === "@skyway" && (
                    <span style={{
                      background: "linear-gradient(135deg, #00e5ff, #0077b6)",
                      color: "#fff", fontSize: 9, fontWeight: 700,
                      padding: "1px 6px", borderRadius: 4, letterSpacing: "0.5px",
                    }}>OFFICIAL</span>
                  )}
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>{post.handle}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>·</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{post.time}</span>
                </div>

                {/* Location / flight tag */}
                {(post.location || post.flightTag) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                    {post.location && (
                      <span style={{ color: "rgba(0,229,255,0.6)", fontSize: 11 }}>📍 {post.location}</span>
                    )}
                    {post.flightTag && (
                      <span style={{
                        color: "#00e5ff", fontSize: 11, fontWeight: 600,
                        background: "rgba(0,229,255,0.1)", padding: "1px 8px",
                        borderRadius: 8, cursor: "pointer",
                      }}>
                        ✈ {post.flightTag}
                      </span>
                    )}
                  </div>
                )}

                {/* Content */}
                <p style={{
                  color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.6,
                  margin: "8px 0", whiteSpace: "pre-wrap",
                }}>
                  {post.content}
                </p>

                {/* Image placeholder */}
                {post.image && (
                  <div style={{
                    width: "100%", height: 220, borderRadius: 16,
                    background: IMAGE_GRADIENTS[post.image] || "linear-gradient(135deg, #0a1628, #1a2a4a)",
                    marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.08) 0%, transparent 60%)",
                    }} />
                    <span style={{ fontSize: 48, opacity: 0.4, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}>✈</span>
                  </div>
                )}

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {post.tags.map((tag) => (
                      <span key={tag} style={{
                        color: "rgba(0,229,255,0.7)", fontSize: 12, cursor: "pointer",
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 32, marginTop: 4 }}>
                  <button
                    onClick={() => toggleLike(post.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center", gap: 6,
                      color: post.liked ? "#ff3b5c" : "rgba(255,255,255,0.3)",
                      fontSize: 13, transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{post.liked ? "♥" : "♡"}</span>
                    {formatCount(post.likes)}
                  </button>
                  <button style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    display: "flex", alignItems: "center", gap: 6,
                    color: "rgba(255,255,255,0.3)", fontSize: 13,
                  }}>
                    <span style={{ fontSize: 14 }}>💬</span>
                    {formatCount(post.comments)}
                  </button>
                  <button style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    display: "flex", alignItems: "center", gap: 6,
                    color: "rgba(255,255,255,0.3)", fontSize: 13,
                  }}>
                    <span style={{ fontSize: 14 }}>↗</span>
                    {formatCount(post.shares)}
                  </button>
                  <button style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    marginLeft: "auto",
                    color: "rgba(255,255,255,0.2)", fontSize: 13,
                  }}>
                    ⋯
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}

        {/* ── Trending section ── */}
        <div style={{ padding: "24px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: "-0.2px" }}>
            Trending in Aviation
          </h3>
          {[
            { tag: "#A321XLR", posts: "2.4k posts", desc: "Airbus A321XLR EIS confirmed" },
            { tag: "#777X", posts: "1.8k posts", desc: "First revenue flight from Chicago" },
            { tag: "#KATL", posts: "956 posts", desc: "ATL runway closure causing delays" },
            { tag: "#AvGeek", posts: "12.3k posts", desc: "Always trending" },
          ].map((trend) => (
            <div key={trend.tag} style={{
              padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
              cursor: "pointer",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ color: "#00e5ff", fontSize: 15, fontWeight: 600 }}>{trend.tag}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>{trend.posts} · {trend.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Suggested accounts ── */}
        <div style={{ padding: "24px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: "-0.2px" }}>
            Who to Follow
          </h3>
          {[
            { name: "FlightRadar Nerds", handle: "@fr_nerds", desc: "Daily aviation content", color: "#2563eb" },
            { name: "Airport Ops Daily", handle: "@airport_ops", desc: "Behind-the-scenes airport operations", color: "#16a34a" },
            { name: "Cockpit Stories", handle: "@cockpit_tales", desc: "Real pilots, real stories", color: "#dc2626" },
          ].map((acc) => (
            <div key={acc.handle} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22, background: acc.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>
                {acc.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{acc.name}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{acc.handle} · {acc.desc}</div>
              </div>
              <button style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16, padding: "6px 16px", color: "#fff",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
