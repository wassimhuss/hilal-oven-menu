'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/use-language';
import { ArrowUpRight, MapPin, Phone, Wheat, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DirectionProvider } from '@/components/ui/direction';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { formatPrice, type MenuCategory, type MenuItem } from '@/lib/menu';
import {
  categoryImageUrl,
  listMenuCategories,
  listMenuItems,
} from '@/lib/supabase-menu';

function InstagramIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Menu() {
  const [lang, setLang] = useLanguage();
  const [category, setCategory] = useState<string>('');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>(
    'loading',
  );
  const [retry, setRetry] = useState(0);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const ar = lang === 'ar';
  useEffect(() => {
    let disposed = false;
    let hasLoaded = false;
    let controller: AbortController;
    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const [itemData, categoryData] = await Promise.all([
          listMenuItems(),
          listMenuCategories(),
        ]);
        if (controller.signal.aborted) return;
        if (!disposed) {
          setItems(itemData);
          setCategories(categoryData);
          setCategory((current) =>
            categoryData.some((entry) => entry.id === current)
              ? current
              : (categoryData[0]?.id ?? ''),
          );
          setStatus('ready');
          setRefreshFailed(false);
          hasLoaded = true;
        }
      } catch (error) {
        if (
          !disposed &&
          !(error instanceof DOMException && error.name === 'AbortError')
        ) {
          if (!hasLoaded) setStatus('error');
          else setRefreshFailed(true);
        }
      }
    };
    const visibleRefresh = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    void refresh();
    const interval = window.setInterval(visibleRefresh, 30000);
    window.addEventListener('focus', visibleRefresh);
    document.addEventListener('visibilitychange', visibleRefresh);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener('focus', visibleRefresh);
      document.removeEventListener('visibilitychange', visibleRefresh);
    };
  }, [retry]);
  return (
    <DirectionProvider direction={ar ? 'rtl' : 'ltr'}>
      <div className="menu-shell" dir={ar ? 'rtl' : 'ltr'}>
        <a className="skip-link" href="#menu">
          {ar ? 'انتقل إلى القائمة' : 'Skip to menu'}
        </a>
        <header className="masthead">
          <Link href="/" className="wordmark" aria-label="Hilal Oven">
            <span>
              HILAL <span className="wordmark-light">OVEN</span>
            </span>
            <span className="wordmark-ar" lang="ar">
              فرن هلال
            </span>
          </Link>
          <div className="language-control" aria-label="Language">
            <button onClick={() => setLang('en')} aria-pressed={!ar}>
              EN
            </button>
            <span></span>
            <button onClick={() => setLang('ar')} aria-pressed={ar} lang="ar">
              عربي
            </button>
          </div>
        </header>
        <section
          className="menu-cover"
          aria-label={ar ? 'فرن هلال، طرابلس' : 'Hilal Oven, Tripoli'}
        >
          <div className="cover-logo">
            <Image
              unoptimized
              src="/images/hilal-logo.webp"
              width={480}
              height={447}
              alt="Hilal Oven"
              fetchPriority="high"
            />
          </div>
          <div className="cover-caption">
            <span className="gold-rule" />
            <span>{ar ? 'طرابلس، لبنان' : 'TRIPOLI, LEBANON'}</span>
            <span className="gold-rule" />
          </div>
        </section>
        <main id="menu">
          <div className="menu-intro">
            <div>
              <span className="eyebrow">
                {ar ? 'من فرننا' : 'FROM OUR OVEN'}
              </span>
              <h1>
                {ar ? 'قائمتنا' : 'Our menu'}
                <span className="title-dot">.</span>
              </h1>
            </div>
            <span className="currency-note">
              {ar ? 'الأسعار بالليرة اللبنانية' : 'Prices in Lebanese pounds'}
              <span>{ar ? 'LBP' : 'ل.ل.'}</span>
            </span>
          </div>
          {status === 'error' ? (
            <Empty>
              <EmptyTitle>
                {ar ? 'تعذّر تحميل القائمة' : 'The menu could not load'}
              </EmptyTitle>
              <EmptyDescription>
                {ar ? 'يرجى المحاولة مجدداً.' : 'Please try again in a moment.'}
              </EmptyDescription>
              <button
                className="text-link"
                onClick={() => {
                  setStatus('loading');
                  setRetry((v) => v + 1);
                }}
              >
                <RefreshCw size={15} />
                {ar ? 'حاول مجدداً' : 'Try again'}
              </button>
              <a className="text-link" href="tel:+96171636189">
                <bdi>71 636 189</bdi>
              </a>
            </Empty>
          ) : status === 'ready' && !categories.length ? (
            <Empty className="menu-empty">
              <EmptyHeader>
                <Wheat size={28} strokeWidth={1.2} className="empty-wheat" />
                <EmptyTitle>
                  {ar ? 'القائمة قيد التحضير' : 'Our menu is being prepared'}
                </EmptyTitle>
                <EmptyDescription>
                  {ar
                    ? 'اتصل بنا للاستفسار عن الأصناف والأسعار.'
                    : 'Call us for today’s items and prices.'}
                </EmptyDescription>
              </EmptyHeader>
              <a className="text-link" href="tel:+96171636189">
                <Phone size={15} />
                <bdi>71 636 189</bdi>
                <ArrowUpRight size={15} />
              </a>
            </Empty>
          ) : (
            <Tabs
              value={category}
              onValueChange={(v) => setCategory(String(v))}
              className="menu-tabs"
            >
              <div className="category-nav">
                <TabsList
                  className="category-list"
                  aria-label={ar ? 'أقسام القائمة' : 'Menu categories'}
                >
                  {categories.map((c) => (
                    <TabsTrigger
                      key={c.id}
                      value={c.id}
                      className="category-tab"
                    >
                      {ar ? c.nameAr : c.nameEn}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {categories.map((c, index) => (
                <TabsContent key={c.id} value={c.id} className="category-panel">
                  <div className="category-heading">
                    <div className="category-heading-copy">
                      <span className="category-number">0{index + 1}</span>
                      <h2>{ar ? c.nameAr : c.nameEn}</h2>
                      <span className="category-other" lang={ar ? 'en' : 'ar'}>
                        {ar ? c.nameEn : c.nameAr}
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="category-photo"
                      style={{
                        backgroundImage: categoryImageUrl(c.imagePath)
                          ? `url("${categoryImageUrl(c.imagePath)}")`
                          : undefined,
                        backgroundPosition: c.imagePosition,
                        backgroundSize: c.imagePath ? 'cover' : undefined,
                      }}
                    />
                  </div>
                  <div className="menu-items" aria-live="polite">
                    {refreshFailed && (
                      <p className="notice error">
                        {ar
                          ? 'تعذّر تحديث القائمة. قد تكون بعض المعلومات قديمة.'
                          : 'Could not refresh the menu. Some details may have changed.'}{' '}
                        <button
                          className="text-link"
                          onClick={() => setRetry((v) => v + 1)}
                        >
                          {ar ? 'حاول مجدداً' : 'Retry'}
                        </button>
                      </p>
                    )}
                    {status === 'loading' ? (
                      <p className="state-message">
                        {ar ? 'جارٍ تحميل القائمة…' : 'Loading the menu…'}
                      </p>
                    ) : items.filter((i) => i.category === c.id).length ? (
                      items
                        .filter((i) => i.category === c.id)
                        .map((item) => (
                          <article
                            className={`menu-item ${!item.available ? 'is-unavailable' : ''}`}
                            key={item.id}
                          >
                            <div className="menu-item-copy">
                              <h3>
                                {ar
                                  ? item.nameAr || item.nameEn
                                  : item.nameEn || item.nameAr}
                              </h3>
                              {(ar
                                ? item.descriptionAr
                                : item.descriptionEn) && (
                                <p>
                                  {ar ? item.descriptionAr : item.descriptionEn}
                                </p>
                              )}
                              {!item.available && (
                                <span className="unavailable-label">
                                  {ar
                                    ? 'غير متوفر حالياً'
                                    : 'Currently unavailable'}
                                </span>
                              )}
                            </div>
                            {item.variants.length ? (
                              <dl className="item-variants">
                                {item.variants.map((variant, index) => (
                                  <div key={`${variant.nameEn}-${index}`}>
                                    <dt>
                                      {ar
                                        ? variant.nameAr || variant.nameEn
                                        : variant.nameEn || variant.nameAr}
                                    </dt>
                                    <dd>
                                      {formatPrice(variant.priceLbp, lang)}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            ) : (
                              <span className="item-price">
                                {formatPrice(item.priceLbp, lang)}
                              </span>
                            )}
                          </article>
                        ))
                    ) : (
                      <Empty className="menu-empty">
                        <EmptyHeader>
                          <Wheat
                            size={28}
                            strokeWidth={1.2}
                            className="empty-wheat"
                          />
                          <EmptyTitle>
                            {ar
                              ? 'القائمة قيد التحضير'
                              : 'Our menu is being prepared'}
                          </EmptyTitle>
                          <EmptyDescription>
                            {ar
                              ? 'اتصل بنا للاستفسار عن الأصناف والأسعار.'
                              : 'Call us for today’s items and prices.'}
                          </EmptyDescription>
                        </EmptyHeader>
                        <a className="text-link" href="tel:+96171636189">
                          <Phone size={15} />
                          <bdi>71 636 189</bdi>
                          <ArrowUpRight size={15} />
                        </a>
                      </Empty>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
          <div className="menu-end">
            <span />
            <Wheat size={21} strokeWidth={1.1} />
            <span />
          </div>
        </main>
        <footer className="menu-footer">
          <div className="footer-brand">HILAL OVEN</div>
          <div className="footer-links">
            <a href="tel:+96171636189">
              <Phone size={17} />
              <bdi>71 636 189</bdi>
            </a>
            <a
              href="https://www.instagram.com/hilaloven/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <InstagramIcon />
              <bdi>@HILALOVEN</bdi>
            </a>
          </div>
          <p>
            <MapPin size={14} />
            {ar ? 'طرابلس، لبنان' : 'Tripoli, Lebanon'}
          </p>
          <Link href="/admin" className="admin-link">
            {ar ? 'إدارة القائمة' : 'Manage menu'}
            <ArrowUpRight size={13} />
          </Link>
        </footer>
      </div>
    </DirectionProvider>
  );
}
