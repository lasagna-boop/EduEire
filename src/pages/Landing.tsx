import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/useAuth";
import AppHeader from "../components/AppHeader";
import { LandingUniversityBadge } from "../components/LandingUniversityBadge";
import LandingHeroShader from "../components/LandingHeroShader";
import PostCard from "../components/PostCard";
import "../styles/landing.css";
import {
  DEFAULT_COMMUNITY_SEEDS,
  getUserSubscriptions,
  listThreads,
  ensureDefaultCommunities,
  subscribeToCommunity,
  type Community,
  type Thread,
  unsubscribeFromCommunity,
} from "../lib/firestore";
import { db } from "../lib/firebase";
import { threadVisibleInFeed } from "../lib/firestoreFormat";
import { threadsToPostCardPosts } from "../lib/threadPostMap";
import type { PostCardPost } from "../types/postCard";

/** Higher member count first; ties use curated seed order so the list is stable when counts are 0. */
const COMMUNITY_SEED_ORDER = new Map(
  DEFAULT_COMMUNITY_SEEDS.map((c, index) => [c.id, index])
);

function sortCommunitiesByMembers(list: Community[]): Community[] {
  return [...list].sort((a, b) => {
    const ma = Number(a.memberCount) || 0;
    const mb = Number(b.memberCount) || 0;
    const byMembers = mb - ma;
    if (byMembers !== 0) return byMembers;
    const oa = COMMUNITY_SEED_ORDER.get(a.id) ?? 999;
    const ob = COMMUNITY_SEED_ORDER.get(b.id) ?? 999;
    if (oa !== ob) return oa - ob;
    return (a.fullName || a.name).localeCompare(b.fullName || b.name);
  });
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [universitiesByMembers, setUniversitiesByMembers] = useState<Community[]>([]);
  const [universitiesExpanded, setUniversitiesExpanded] = useState(false);
  const [subscriptionIds, setSubscriptionIds] = useState<string[]>([]);
  const [pendingCommunityId, setPendingCommunityId] = useState<string | null>(null);
  const [registeredUsersCount, setRegisteredUsersCount] = useState<number | null>(null);
  const [verifiedStudentsCount, setVerifiedStudentsCount] = useState<number | null>(null);
  const [discussionsCount, setDiscussionsCount] = useState<number | null>(null);
  const [trendingPost, setTrendingPost] = useState<PostCardPost | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const loadPopularUniversities = async () => {
      try {
        const communities = await ensureDefaultCommunities();
        setUniversitiesByMembers(sortCommunitiesByMembers(communities));
      } catch (e) {
        console.error("Failed to load universities", e);
      }
    };

    void loadPopularUniversities();
  }, []);

  const displayedUniversities = universitiesExpanded
    ? universitiesByMembers
    : universitiesByMembers.slice(0, 3);
  const canExpandUniversities = universitiesByMembers.length > 3;

  useEffect(() => {
    const loadTrendingThread = async () => {
      try {
        const { threads: allThreads } = await listThreads({ pageSize: 50 });
        const now = Date.now();
        const visibleThreads = allThreads.filter((t: Thread) => threadVisibleInFeed(t, now));
        if (visibleThreads.length === 0) {
          setTrendingPost(null);
          return;
        }

        const topThread = visibleThreads.reduce((best, current) =>
          (current.score ?? 0) > (best.score ?? 0) ? current : best
        );
        const mapped = await threadsToPostCardPosts([topThread], "feed");
        setTrendingPost(mapped[0] ?? null);
      } catch (e) {
        console.error("Failed to load trending thread", e);
      }
    };

    void loadTrendingThread();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLandingStats = async () => {
      let reg: number | null = null;
      let ver: number | null = null;
      let disc: number | null = null;

      try {
        const pub = await getDoc(doc(db, "public_stats", "landing"));
        if (!cancelled && pub.exists()) {
          const d = pub.data();
          if (typeof d.registeredUsersCount === "number") {
            reg = d.registeredUsersCount;
            setRegisteredUsersCount(reg);
          }
          if (typeof d.verifiedStudentsCount === "number") {
            ver = d.verifiedStudentsCount;
            setVerifiedStudentsCount(ver);
          }
          if (typeof d.discussionsCount === "number") {
            disc = d.discussionsCount;
            setDiscussionsCount(disc);
          }
        }
      } catch (e) {
        console.error("Failed to load public_stats landing snapshot", e);
      }

      try {
        const threadsSnap = await getCountFromServer(collection(db, "threads"));
        if (cancelled) return;
        const n = threadsSnap.data().count;
        if (disc === null) {
          disc = n;
          setDiscussionsCount(n);
        }
      } catch (e) {
        console.error("Failed to load thread count", e);
      }

      if (!user || cancelled) return;

      try {
        const [regSnap, verifiedSnap] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(query(collection(db, "users"), where("studentEmailConfirmed", "==", true))),
        ]);
        if (cancelled) return;
        setRegisteredUsersCount(regSnap.data().count);
        setVerifiedStudentsCount(verifiedSnap.data().count);
      } catch (e) {
        console.error("Failed to load authenticated user counts", e);
      }
    };

    void loadLandingStats();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (!user) {
        setSubscriptionIds([]);
        return;
      }

      try {
        const ids = await getUserSubscriptions(user.uid);
        setSubscriptionIds(ids);
      } catch (e) {
        console.error("Failed to load subscriptions", e);
      }
    };

    void loadSubscriptions();
  }, [user]);

  const handleToggleSubscription = async (community: Community) => {
    if (!user) {
      navigate("/login");
      return;
    }

    const isJoined = subscriptionIds.includes(community.id);
    setPendingCommunityId(community.id);

    try {
      if (isJoined) {
        await unsubscribeFromCommunity(user.uid, community.id);
        setSubscriptionIds((prev) => prev.filter((id) => id !== community.id));
        setUniversitiesByMembers((prev) =>
          sortCommunitiesByMembers(
            prev.map((item) =>
              item.id === community.id
                ? { ...item, memberCount: Math.max((item.memberCount || 0) - 1, 0) }
                : item
            )
          )
        );
      } else {
        await subscribeToCommunity(user.uid, community.id);
        setSubscriptionIds((prev) => [...prev, community.id]);
        setUniversitiesByMembers((prev) =>
          sortCommunitiesByMembers(
            prev.map((item) =>
              item.id === community.id ? { ...item, memberCount: (item.memberCount || 0) + 1 } : item
            )
          )
        );
      }
    } catch (e) {
      console.error("Failed to update subscription", e);
    } finally {
      setPendingCommunityId(null);
    }
  };

  return (
    <div className="landing">
      <AppHeader
        activeTopLink="communities"
        search={{
          placeholder: "Search communities, notes, or universities...",
          value: searchQuery,
          onChange: setSearchQuery,
          onSubmit: () => {
            if (searchQuery.trim()) {
              navigate(`/feed?q=${encodeURIComponent(searchQuery.trim())}`);
            }
          },
        }}
      />

      <div className="landing__layout">
        <aside className="landing__sidebar landing__sidebar--left">
          <div className="landing__panel">
            <div className="landing__panel-head">
              <div className="landing__panel-icon">🧭</div>
              <div>
                <h3>Browse</h3>
                <p className="landing__panel-tagline">Where each link goes</p>
              </div>
            </div>

            <p className="landing__nav-hint">
              The main feed mixes every institution; community hubs and the map add structure.
            </p>

            <nav className="landing__menu" aria-label="Primary destinations">
              <span className="landing__nav-group-label">Feed</span>
              <Link to="/feed" className="landing__menu-item landing__menu-item--active">
                <span aria-hidden>🏠</span> All posts
              </Link>
              <Link to="/feed?sort=popular" className="landing__menu-item">
                <span aria-hidden>📈</span> Popular
              </Link>
              <Link to="/feed?topic=Admissions" className="landing__menu-item">
                <span aria-hidden>📝</span> Admissions threads
              </Link>

              <span className="landing__nav-group-label">Discover</span>
              <Link to="/universities" className="landing__menu-item">
                <span aria-hidden>🌐</span> University Explorer
              </Link>
              <Link to="/map" className="landing__menu-item">
                <span aria-hidden>🗺️</span> Campus map
              </Link>
              <Link to="/flairs" className="landing__menu-item">
                <span aria-hidden>🏷️</span> Topic tags (Flairs)
              </Link>
            </nav>

            <Link
              to={user ? "/feed" : "/login"}
              className="landing__cta-btn"
            >
              {user ? "Create a post" : "Log in to post"}
            </Link>
          </div>

        </aside>

        <main className="landing__main">
          <section className="landing__hero">
            {!prefersReducedMotion ? (
              <div className="landing__hero-shader" aria-hidden>
                <LandingHeroShader />
              </div>
            ) : null}
            {!prefersReducedMotion ? <div className="landing__hero-scrim" aria-hidden /> : null}
            <div className="landing__hero-content">
              <span className="landing__hero-badge">
                <span className="landing__hero-dot" />
                The Digital Cluster
              </span>
              <h1>
                Where Ireland&apos;s students <br />
                <span>connect.</span>
              </h1>
              <p>
                {registeredUsersCount !== null ? (
                  <>
                    Join {registeredUsersCount.toLocaleString()} scholars across Ireland. Engage in high-level
                    discourse, share premium resources, and find your academic home.
                  </>
                ) : (
                  <>
                    Join Ireland&apos;s student community. Engage in high-level discourse, share resources, and find
                    your academic home.
                  </>
                )}
              </p>
              <div className="landing__hero-actions">
                <Link to="/feed" className="landing__btn landing__btn--hero-primary">
                  Open the feed
                </Link>
                <Link to="/universities" className="landing__btn landing__btn--hero-secondary">
                  Explore institutions
                </Link>
              </div>
            </div>
            <div className="landing__hero-glow" />
          </section>

          <section className="landing__stats">
            <article className="landing__stat-card">
              <div className="landing__stat-icon landing__stat-icon--blue">👥</div>
              <div>
                <div className="landing__stat-value">
                  {verifiedStudentsCount === null ? "—" : verifiedStudentsCount.toLocaleString()}
                </div>
                <div className="landing__stat-label">Verified Students</div>
              </div>
            </article>
            <article className="landing__stat-card">
              <div className="landing__stat-icon landing__stat-icon--green">📄</div>
              <div>
                <div className="landing__stat-value">
                  {registeredUsersCount === null ? "—" : registeredUsersCount.toLocaleString()}
                </div>
                <div className="landing__stat-label">Website Users</div>
              </div>
            </article>
            <article className="landing__stat-card">
              <div className="landing__stat-icon landing__stat-icon--rose">💬</div>
              <div>
                <div className="landing__stat-value">
                  {discussionsCount === null ? "—" : discussionsCount.toLocaleString()}
                </div>
                <div className="landing__stat-label">Discussions</div>
              </div>
            </article>
          </section>

          <div className="landing__section-head">
            <h2>Trending Now</h2>
            <button type="button" className="landing__icon-btn" aria-label="Filter trending">
              ⛃
            </button>
          </div>

          <section className="landing__feed">
            {trendingPost ? (
              <PostCard post={trendingPost} />
            ) : (
              <article className="landing__post">
                <div className="landing__post-body">
                  <h3>No trending discussions yet</h3>
                  <p>Be the first one to start a discussion.</p>
                </div>
              </article>
            )}
          </section>
        </main>

        <aside className="landing__sidebar landing__sidebar--right">
          <div className="landing__panel">
            <div className="landing__widget-head">
              <h3>Popular Universities</h3>
              <span aria-hidden>📈</span>
            </div>
            <div
              className={[
                "landing__community-list",
                universitiesExpanded ? "landing__community-list--expanded" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {displayedUniversities.map((community, index) => (
                <div className="landing__community-item" key={community.id}>
                  <Link
                    to={`/c/${community.id}`}
                    className="landing__community-item-link"
                    aria-label={`Open discussions for ${community.fullName || community.name}`}
                  >
                    <div className="landing__community-info">
                      <LandingUniversityBadge
                        prefersReducedMotion={prefersReducedMotion}
                        variantClass={index === 1 ? "landing__community-badge--blue" : ""}
                      />
                      <div className="landing__community-text">
                        <div className="landing__community-name" title={community.fullName || community.name}>
                          {community.fullName || community.name}
                        </div>
                        <div className="landing__community-members">
                          {community.memberCount || 0} {(community.memberCount || 0) === 1 ? "member" : "members"}
                        </div>
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleToggleSubscription(community)}
                    disabled={pendingCommunityId === community.id}
                    className={`landing__community-join-btn ${
                      subscriptionIds.includes(community.id) ? "landing__community-join-btn--joined" : ""
                    }`}
                  >
                    {pendingCommunityId === community.id
                      ? "..."
                      : subscriptionIds.includes(community.id)
                        ? "Joined"
                        : "Join"}
                  </button>
                </div>
              ))}
            </div>
            {canExpandUniversities ? (
              <button
                type="button"
                className="landing__subtle-btn"
                aria-expanded={universitiesExpanded}
                onClick={() => setUniversitiesExpanded((v) => !v)}
              >
                {universitiesExpanded
                  ? "Show less"
                  : `View all (${universitiesByMembers.length})`}
              </button>
            ) : null}
          </div>

          <div className="landing__roadmap">
            <h3>Topic tags &amp; flairs</h3>
            <p>
              Browse community tags, propose new ones, and vote on what should shape discussions across EduÉire.
            </p>
            <Link to="/flairs" className="landing__roadmap-btn">
              Open flairs
            </Link>
            <div className="landing__roadmap-orb" />
          </div>
        </aside>
      </div>

      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <div className="landing__footer-brand">
            <div className="landing__footer-logo">EduÉire</div>
            <p>
              Designed for the next generation of Irish scholars. Promoting civil discourse and academic excellence
              since 2026.
            </p>
          </div>

          <div className="landing__footer-grid">
            <div>
              <h4>Community</h4>
              <Link to="/guidelines">Guidelines</Link>
              <Link to="/moderator-team">Moderator Team</Link>
            </div>
            <div>
              <h4>Explore</h4>
              <Link to="/universities">University Explorer</Link>
              <Link to="/map">Campus map</Link>
              <Link to="/flairs">Topic tags</Link>
            </div>
            <div>
              <h4>Stay Connected</h4>
              <div className="landing__socials">
                <button type="button">📱</button>
                <button type="button">📧</button>
              </div>
              <p className="landing__copyright">© 2026 EduÉire. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
