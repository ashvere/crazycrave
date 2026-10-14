import Script from "next/script";
import { legacyJs } from "@/lib/legacy-css";
import type { CatalogItem, MenuRow, ShopRow } from "@/lib/menu-catalog";
import { menuImageSrc, shopLogoSrc } from "@/lib/shop-logos";
import barangayMap from "@/lib/data/barangay-pototan.json";
import { HomeMenuModal } from "@/components/store/home-menu-modal";

type PicksConfig = {
  catalog: CatalogItem[];
  imgBase: string;
  restaurantUrl: string;
  loggedIn: boolean;
  defaultLat: number;
  defaultLon: number;
  defaultPlace: string;
};

function CrispyPicksBlock({ picksConfig }: { picksConfig: PicksConfig }) {
  const json = JSON.stringify(picksConfig).replace(/</g, "\\u003c");
  return (
    <>
      <section
        className="crispy-picks"
        id="crispyPicks"
        aria-labelledby="crispy-picks-heading"
        data-weather="cloudy"
      >
        <div className="crispy-picks__inner">
          <div className="crispy-picks__aura" aria-hidden="true" />
          <header className="crispy-picks__head">
            <div className="crispy-picks__icon" aria-hidden="true">
              <i className="bi bi-cloud-sun" />
            </div>
            <div className="crispy-picks__head-text">
              <p className="crispy-picks__eyebrow">Crispy Picks</p>
              <h2 id="crispy-picks-heading" className="crispy-picks__title">
                Perfect for today’s weather
              </h2>
              <p className="crispy-picks__context" id="crispyPicksContext">
                Checking weather near you…
              </p>
            </div>
          </header>
          <div className="crispy-picks__grid" id="crispyPicksGrid" role="list" aria-live="polite" />
          <p className="crispy-picks__note" id="crispyPicksNote">
            Suggestions match your local weather and items from our kitchens.
          </p>
        </div>
      </section>
      <script
        id="kkCrispyPicksConfig"
        type="application/json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: json }}
      />
      <Script src={legacyJs("crispy-picks.js")} strategy="afterInteractive" />
    </>
  );
}

type HomeIndexProps = {
  isLoggedIn: boolean;
  userName: string;
  shops: ShopRow[];
  menusByShop: Map<number, MenuRow[]>;
  picksConfig: PicksConfig;
  scheduleMinDate: string;
  dataError: string | null;
  /** Average food rating per shop id (only shops with ratings). */
  shopRatings?: Record<number, { avg: number; count: number }>;
};

function ShopRating({ rating }: { rating?: { avg: number; count: number } }) {
  if (!rating || rating.count === 0) return null;
  return (
    <span className="shop-rating" aria-label={`Rated ${rating.avg.toFixed(1)} out of 5 from ${rating.count} review${rating.count === 1 ? "" : "s"}`}>
      <i className="bi bi-star-fill" aria-hidden="true" />
      <strong>{rating.avg.toFixed(1)}</strong>
      <span>({rating.count})</span>
    </span>
  );
}

export function HomeIndex({
  isLoggedIn,
  userName,
  shops,
  menusByShop,
  picksConfig,
  scheduleMinDate,
  dataError,
  shopRatings = {},
}: HomeIndexProps) {
  const splashSrc = "/images/splash_art_official.png";
  const barangay = barangayMap as Record<string, number>;

  return (
    <>
      {dataError ? (
        <p className="alert alert-warning mx-auto my-4" style={{ maxWidth: 720 }}>
          {dataError}
        </p>
      ) : null}

      {!isLoggedIn ? (
        <>
          <section id="hero" className="hero hero--split" aria-labelledby="hero-heading">
            <div className="hero-deco" aria-hidden="true">
              <span className="hero-deco__t">Crispy</span>
              <span className="hero-deco__t hero-deco__t--b">Crave</span>
              <span className="hero-deco__t hero-deco__t--c">Fresh</span>
            </div>

            <div className="hero-inner">
              <div className="hero-copy">
                <p className="hero-eyebrow">Crispy Crave</p>
                <h1 id="hero-heading" className="hero-title">
                  Local favorites, elevated<span className="hero-title__dot">.</span>
                  <span className="hero-title__sub">
                    Local kitchens. One simple checkout. Straight to your door.
                  </span>
                </h1>
                <p className="hero-lede">
                  Serving Pototan — browse menus from trusted local restaurants, check out in a few taps, and
                  get meals, snacks, and drinks delivered to your barangay while they&apos;re still fresh.
                </p>
                <div className="hero-cta-row">
                  <button
                    type="button"
                    className="order-btn"
                    data-bs-toggle="modal"
                    data-bs-target="#kkAuthModal"
                    data-auth-tab="login"
                  >
                    Order now
                  </button>
                  <a href="#shops" className="hero-scroll-hint">
                    Scroll to menus
                  </a>
                </div>
              </div>

              <div className="hero-visual">
                <div className="hero-visual__stack">
                  <div className="hero-visual__blob" aria-hidden="true" />
                  <img
                    src={splashSrc}
                    alt="Crispy Crave — food from Pototan kitchens"
                    className="hero-visual__img"
                    fetchPriority="high"
                    decoding="async"
                  />
                  <div className="hero-visual__badge" aria-hidden="true">
                    <strong>Today</strong>
                    <span>Made to order</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="shops" className="shops-section">
            <div className="section-inner">
              <header className="section-head">
                <p className="section-eyebrow">Shops</p>
                <h2>Choose a kitchen</h2>
                <p>
                  See dishes from each kitchen below, or open a shop for the full menu and checkout.
                </p>
              </header>

              {picksConfig.catalog.length > 0 ? <CrispyPicksBlock picksConfig={picksConfig} /> : null}

              <div className="shops-grid">
                {shops.length > 0 ? (
                  shops.map((shop) => {
                    const sid = shop.id;
                    const stripMenus = (menusByShop.get(sid) ?? []).slice(0, 10);
                    return (
                      <article key={sid} className="shop-card shop-card--preview">
                        <a href={`/restaurant?id=${sid}`} className="shop-card__hero">
                          <img
                            src={shopLogoSrc(shop.logo)}
                            alt={shop.name}
                            className="shop-logo"
                          />
                          <div className="shop-info">
                            <h3>{shop.name}</h3>
                            <p>{shop.description}</p>
                            <small>
                              Delivery {shop.delivery_time} <ShopRating rating={shopRatings[sid]} />
                            </small>
                          </div>
                        </a>
                        {stripMenus.length > 0 ? (
                          <div
                            className="shop-card__menu-strip"
                            role="list"
                            aria-label={`${shop.name} — popular items`}
                          >
                            {stripMenus.map((item) => (
                              <a
                                key={item.id}
                                href={`/restaurant?id=${sid}`}
                                className="shop-card__menu-chip"
                                role="listitem"
                              >
                                <span className="shop-card__menu-chip-img">
                                  <img
                                    src={menuImageSrc(item.image)}
                                    alt={item.name}
                                    width={72}
                                    height={72}
                                    loading="lazy"
                                  />
                                </span>
                                <span className="shop-card__menu-chip-name">{item.name}</span>
                                <span className="shop-card__menu-chip-price">
                                  ₱{Number(item.price).toFixed(2)}
                                </span>
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                ) : (
                  <p className="shops-empty">No restaurants available right now. Check back soon.</p>
                )}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section id="shops" className="home-logged" aria-labelledby="home-logged-heading">
          <div className="home-logged__inner">
            <header className="home-welcome">
              <h1 id="home-logged-heading" className="home-welcome__title">
                Welcome<span className="home-welcome__comma">,</span>
                <span className="home-welcome__name">
                  {userName !== "" ? userName : "back"}
                </span>
              </h1>
              <p className="home-welcome__hint">Please choose your order.</p>
            </header>

            {picksConfig.catalog.length > 0 ? <CrispyPicksBlock picksConfig={picksConfig} /> : null}

            {shops.length === 0 ? (
              <p className="home-logged__empty">No restaurants are open right now. Please check back soon.</p>
            ) : (
              <div className="home-shops">
                {shops.map((shop) => {
                  const sid = shop.id;
                  const previewMenus = menusByShop.get(sid) ?? [];
                  return (
                    <article key={sid} className="home-shop-card">
                      <div className="home-shop-card__top">
                        <a href={`/restaurant?id=${sid}`} className="home-shop-card__brand">
                          <span className="home-shop-card__logo-wrap">
                            <img
                              src={shopLogoSrc(shop.logo)}
                              alt={shop.name}
                              width={56}
                              height={56}
                              loading="lazy"
                              className="home-shop-card__logo"
                            />
                          </span>
                          <span className="home-shop-card__brand-text">
                            <span className="home-shop-card__name">{shop.name}</span>
                            <span className="home-shop-card__meta">
                              <i className="bi bi-clock" aria-hidden="true" />
                              Delivery {shop.delivery_time}
                              <ShopRating rating={shopRatings[sid]} />
                            </span>
                          </span>
                        </a>
                        <a href={`/restaurant?id=${sid}`} className="home-shop-card__link">
                          Open shop
                        </a>
                      </div>

                      {previewMenus.length > 0 ? (
                        <div
                          className="menu-carousel menu-carousel--home"
                          data-menu-carousel
                          role="group"
                          aria-label={`${shop.name} — menu preview`}
                        >
                          <div className="menu-carousel__shell">
                            <button
                              type="button"
                              className="menu-carousel__nav menu-carousel__nav--prev"
                              aria-label="Previous dishes"
                            >
                              <i className="bi bi-chevron-left" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="menu-carousel__nav menu-carousel__nav--next"
                              aria-label="Next dishes"
                            >
                              <i className="bi bi-chevron-right" aria-hidden="true" />
                            </button>
                            <div className="menu-carousel__viewport">
                              <div className="menu-carousel__track">
                                {previewMenus.map((item) => {
                                  const mid = item.id;
                                  const desc = item.description ?? "";
                                  return (
                                    <div key={mid} className="menu-carousel__item">
                                      <div className="home-menu-tile">
                                        <button
                                          type="button"
                                          className="home-menu-tile__media home-menu-tile__media--trigger"
                                          data-bs-toggle="modal"
                                          data-bs-target="#kkHomeMenuModal"
                                          data-kk-open="details"
                                          data-kk-menu-id={mid}
                                          data-kk-shop-id={sid}
                                          data-kk-name={item.name}
                                          data-kk-price={String(item.price)}
                                          data-kk-image={item.image ?? ""}
                                          data-kk-description={desc}
                                          data-kk-shop-name={shop.name}
                                          aria-label={`View ${item.name} — ingredients and order`}
                                        >
                                          <span className="home-menu-tile__img">
                                            <img
                                              src={menuImageSrc(item.image)}
                                              alt=""
                                              width={380}
                                              height={285}
                                              loading="lazy"
                                              decoding="async"
                                            />
                                          </span>
                                        </button>
                                        <div className="home-menu-tile__body">
                                          <span className="home-menu-tile__name">{item.name}</span>
                                          <span className="home-menu-tile__price">
                                            ₱{Number(item.price).toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="home-menu-tile__actions">
                                          <button
                                            type="button"
                                            className="home-menu-tile__btn home-menu-tile__btn--secondary"
                                            data-bs-toggle="modal"
                                            data-bs-target="#kkHomeMenuModal"
                                            data-kk-open="details"
                                            data-kk-menu-id={mid}
                                            data-kk-shop-id={sid}
                                            data-kk-name={item.name}
                                            data-kk-price={String(item.price)}
                                            data-kk-image={item.image ?? ""}
                                            data-kk-description={desc}
                                            data-kk-shop-name={shop.name}
                                          >
                                            Order now
                                          </button>
                                          <button
                                            type="button"
                                            className="home-menu-tile__btn home-menu-tile__btn--primary"
                                            data-bs-toggle="modal"
                                            data-bs-target="#kkHomeMenuModal"
                                            data-kk-open="cart"
                                            data-kk-menu-id={mid}
                                            data-kk-shop-id={sid}
                                            data-kk-name={item.name}
                                            data-kk-price={String(item.price)}
                                            data-kk-image={item.image ?? ""}
                                            data-kk-description={desc}
                                            data-kk-shop-name={shop.name}
                                          >
                                            Add to cart
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="home-shop-card__empty">Menu coming soon — open the shop for updates.</p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {isLoggedIn ? <HomeMenuModal barangayMap={barangay} scheduleMinDate={scheduleMinDate} /> : null}

      {isLoggedIn ? (
        <Script src={legacyJs("home-carousel-and-modal.js")} strategy="afterInteractive" />
      ) : null}
    </>
  );
}
