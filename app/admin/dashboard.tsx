'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/use-language';
import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  ExternalLink,
  QrCode,
  RefreshCw,
  LogOut,
  Wheat,
  Tags,
  LockKeyhole,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { DirectionProvider } from '@/components/ui/direction';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { formatPrice, type MenuCategory, type MenuItem } from '@/lib/menu';
import {
  AdminRequestError,
  categoryImageUrl,
  createMenuCategory,
  createMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  listMenuCategories,
  listMenuItems,
  loginAdmin,
  logoutAdmin,
  removeCategoryImage,
  updateMenuItem,
  updateMenuCategory,
  uploadCategoryImage,
  validateAdminSession,
} from '@/lib/supabase-menu';

type Draft = {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: string;
  price: string;
  variants: Array<{ nameEn: string; nameAr: string; price: string }>;
  available: boolean;
};
const newDraft = (category: string): Draft => ({
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  category,
  price: '',
  variants: [],
  available: true,
});
const SESSION_KEY = 'hilal-oven-admin-session';

export default function AdminDashboard() {
  const [auth, setAuth] = useState<'checking' | 'signed-out' | 'signed-in'>(
    'checking',
  );
  const [sessionToken, setSessionToken] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    let active = true;
    const saved = sessionStorage.getItem(SESSION_KEY) ?? '';
    if (!saved) {
      queueMicrotask(() => {
        if (active) setAuth('signed-out');
      });
      return;
    }
    void validateAdminSession(saved).then((valid) => {
      if (!active) return;
      if (valid) {
        setSessionToken(saved);
        setAuth('signed-in');
      } else {
        sessionStorage.removeItem(SESSION_KEY);
        setAuth('signed-out');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function submitPin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loggingIn || !/^\d{4}$/.test(pin)) {
      setLoginError(
        'Enter the four-digit code. · أدخل الرمز المؤلف من أربعة أرقام.',
      );
      return;
    }
    setLoggingIn(true);
    setLoginError('');
    try {
      const result = await loginAdmin(pin);
      if (!result.ok || !result.sessionToken) {
        if (result.reason === 'LOCKED') {
          const minutes = Math.max(
            1,
            Math.ceil((result.retryAfterSeconds ?? 900) / 60),
          );
          setLoginError(
            `Too many attempts. Try again in ${minutes} minutes. · محاولات كثيرة. حاول بعد ${minutes} دقيقة.`,
          );
        } else if (result.reason === 'NOT_CONFIGURED') {
          setLoginError(
            'Admin access is not configured yet. · لم يتم إعداد دخول المسؤول بعد.',
          );
        } else {
          setLoginError('Incorrect code. · الرمز غير صحيح.');
        }
        return;
      }
      sessionStorage.setItem(SESSION_KEY, result.sessionToken);
      setSessionToken(result.sessionToken);
      setPin('');
      setAuth('signed-in');
    } catch {
      setLoginError(
        'Could not sign in. Check your connection and try again. · تعذّر تسجيل الدخول. حاول مجدداً.',
      );
    } finally {
      setLoggingIn(false);
    }
  }

  if (auth === 'checking') {
    return (
      <main className="admin-gate">
        <p className="state-message">Checking admin access…</p>
      </main>
    );
  }

  if (auth === 'signed-out') {
    return (
      <main className="admin-gate">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} />
          Back to menu · العودة للقائمة
        </Link>
        <section className="login-card">
          <Image
            unoptimized
            src="/images/hilal-logo.webp"
            alt="Hilal Oven"
            width={160}
            height={149}
          />
          <span className="login-lock">
            <LockKeyhole size={22} strokeWidth={1.5} />
          </span>
          <h1>Menu management</h1>
          <p lang="ar" dir="rtl" className="login-ar">
            إدارة قائمة فرن هلال
          </p>
          <p>Enter the owner code to manage menu items and prices.</p>
          <p lang="ar" dir="rtl">
            أدخل رمز المسؤول لإدارة الأصناف والأسعار.
          </p>
          <form className="pin-form" onSubmit={submitPin}>
            <label htmlFor="admin-pin">Admin code · رمز المسؤول</label>
            <input
              id="admin-pin"
              className="pin-input"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="[0-9]{4}"
              maxLength={4}
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
              }
              disabled={loggingIn}
              aria-describedby={loginError ? 'pin-error' : undefined}
            />
            {loginError && (
              <p id="pin-error" className="notice error" role="alert">
                {loginError}
              </p>
            )}
            <Button
              type="submit"
              className="action-button pin-submit"
              disabled={loggingIn || pin.length !== 4}
            >
              {loggingIn ? 'Signing in… · جارٍ الدخول…' : 'Enter · دخول'}
            </Button>
          </form>
          <span className="owner-only">
            For the menu administrator · للمسؤول فقط
          </span>
        </section>
      </main>
    );
  }

  return (
    <Dashboard
      sessionToken={sessionToken}
      onSessionEnded={() => {
        sessionStorage.removeItem(SESSION_KEY);
        setSessionToken('');
        setAuth('signed-out');
      }}
    />
  );
}

function Dashboard({
  sessionToken,
  onSessionEnded,
}: {
  sessionToken: string;
  onSessionEnded: () => void;
}) {
  const [lang, setLang] = useLanguage();
  const ar = lang === 'ar';
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [draft, setDraft] = useState<Draft>(newDraft(''));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MenuItem | null>(null);
  const [formError, setFormError] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null,
  );
  const [categoryDraft, setCategoryDraft] = useState({
    nameEn: '',
    nameAr: '',
    imagePath: null as string | null,
  });
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(
    null,
  );
  const translateError = (err: unknown) => {
    if (
      err instanceof AdminRequestError &&
      err.message.includes('CATEGORY_IN_USE')
    )
      return t(
        'Move or delete this category’s items before deleting it.',
        'انقل أصناف هذا القسم أو احذفها قبل حذف القسم.',
      );
    if (err instanceof AdminRequestError && err.kind === 'conflict')
      return t(
        'This item changed in another session. Close this form, refresh, and try again.',
        'تم تعديل هذا الصنف في جلسة أخرى. أغلق النافذة وحدّث القائمة ثم حاول مجدداً.',
      );
    if (err instanceof AdminRequestError && err.kind === 'session') {
      onSessionEnded();
      return t(
        'Your session has ended. Enter the admin code again.',
        'انتهت الجلسة. أدخل رمز المسؤول مجدداً.',
      );
    }
    return t(
      err instanceof Error ? err.message : 'Please try again.',
      'تعذّر حفظ التغيير. تحقق من اتصالك وحاول مجدداً.',
    );
  };
  const refresh = useCallback(async () => {
    try {
      const [itemData, categoryData] = await Promise.all([
        listMenuItems(),
        listMenuCategories(),
      ]);
      setItems(itemData);
      setCategories(categoryData);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  const reload = () => {
    setLoading(true);
    void refresh();
  };
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  const startAdd = () => {
    const initialCategory =
      filter !== 'all' ? filter : (categories[0]?.id ?? '');
    setEditing(null);
    setDraft(newDraft(initialCategory));
    setFormError('');
    setOpen(true);
  };
  const startEdit = (item: MenuItem) => {
    setEditing(item);
    setDraft({
      ...item,
      price: item.variants.length ? '' : String(item.priceLbp),
      variants: item.variants.map((variant) => ({
        nameEn: variant.nameEn,
        nameAr: variant.nameAr,
        price: String(variant.priceLbp),
      })),
    });
    setFormError('');
    setOpen(true);
  };
  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const price = Number(draft.price);
    const variants = draft.variants.map((variant) => ({
      nameEn: variant.nameEn.trim(),
      nameAr: variant.nameAr.trim(),
      priceLbp: Number(variant.price),
    }));
    const variantsValid = variants.every(
      (variant) =>
        variant.nameEn.length > 0 &&
        variant.nameAr.length > 0 &&
        variant.nameEn.length <= 60 &&
        variant.nameAr.length <= 60 &&
        Number.isSafeInteger(variant.priceLbp) &&
        variant.priceLbp > 0 &&
        variant.priceLbp <= 1_000_000_000,
    );
    const effectivePrice = variants.length
      ? Math.min(...variants.map((variant) => variant.priceLbp))
      : price;
    if (
      !draft.nameEn.trim() ||
      !draft.nameAr.trim() ||
      !variantsValid ||
      (!variants.length &&
        (!draft.price.trim() ||
          !Number.isSafeInteger(price) ||
          price <= 0 ||
          price > 1_000_000_000))
    ) {
      setFormError(
        t(
          'Add bilingual names and a valid whole-number LBP price for the item or every size.',
          'أدخل الأسماء باللغتين وسعراً صحيحاً بالليرة اللبنانية للصنف أو لكل حجم.',
        ),
      );
      return;
    }
    setSaving(true);
    setFormError('');
    setNotice('');
    setError('');
    const body = {
      nameEn: draft.nameEn.trim(),
      nameAr: draft.nameAr.trim(),
      descriptionEn: draft.descriptionEn.trim(),
      descriptionAr: draft.descriptionAr.trim(),
      category: draft.category,
      priceLbp: effectivePrice,
      variants,
      available: draft.available,
    };
    try {
      const saved = editing
        ? await updateMenuItem(
            sessionToken,
            editing.id,
            editing.updatedAt,
            body,
          )
        : await createMenuItem(sessionToken, body);
      if (editing)
        setItems((current) =>
          current.map((i) => (i.id === editing.id ? saved : i)),
        );
      else setItems((current) => [...current, saved]);
      setOpen(false);
      setNotice(
        t(
          'Saved. The customer menu is updated.',
          'تم الحفظ وتحديث قائمة الزبائن.',
        ),
      );
    } catch (err) {
      setFormError(translateError(err));
    } finally {
      setSaving(false);
    }
  }
  async function toggle(item: MenuItem, available: boolean) {
    setBusy(item.id);
    setError('');
    setNotice('');
    try {
      const saved = await updateMenuItem(
        sessionToken,
        item.id,
        item.updatedAt,
        {
          category: item.category,
          nameEn: item.nameEn,
          nameAr: item.nameAr,
          descriptionEn: item.descriptionEn,
          descriptionAr: item.descriptionAr,
          priceLbp: item.priceLbp,
          variants: item.variants,
          available,
        },
      );
      setItems((current) => current.map((i) => (i.id === item.id ? saved : i)));
      setNotice(t('Availability updated.', 'تم تحديث التوفّر.'));
    } catch (err) {
      setError(translateError(err));
    } finally {
      setBusy(null);
    }
  }
  async function remove() {
    if (!toDelete || saving) return;
    setSaving(true);
    setFormError('');
    setNotice('');
    setError('');
    try {
      await deleteMenuItem(sessionToken, toDelete.id, toDelete.updatedAt);
      setItems((current) => current.filter((i) => i.id !== toDelete.id));
      setToDelete(null);
      setNotice(t('Item removed from the menu.', 'تم حذف الصنف من القائمة.'));
    } catch (err) {
      setFormError(translateError(err));
    } finally {
      setSaving(false);
    }
  }
  const startAddCategory = () => {
    setEditingCategory(null);
    setCategoryDraft({ nameEn: '', nameAr: '', imagePath: null });
    setCategoryImageFile(null);
    setCategoryError('');
    setCategoryOpen(true);
  };
  const startEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setCategoryDraft({
      nameEn: category.nameEn,
      nameAr: category.nameAr,
      imagePath: category.imagePath,
    });
    setCategoryImageFile(null);
    setCategoryError('');
    setCategoryOpen(true);
  };
  async function saveCategory(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (categorySaving) return;
    const body = {
      nameEn: categoryDraft.nameEn.trim(),
      nameAr: categoryDraft.nameAr.trim(),
      imagePath: categoryDraft.imagePath,
    };
    if (!body.nameEn || !body.nameAr) {
      setCategoryError(
        t('Add a category name in both languages.', 'أدخل اسم القسم باللغتين.'),
      );
      return;
    }
    setCategorySaving(true);
    setCategoryError('');
    setNotice('');
    setError('');
    try {
      let saved: MenuCategory;
      const previousImagePath = editingCategory?.imagePath ?? null;
      if (editingCategory) {
        const imagePath = categoryImageFile
          ? await uploadCategoryImage(
              sessionToken,
              editingCategory.id,
              categoryImageFile,
            )
          : body.imagePath;
        saved = await updateMenuCategory(
          sessionToken,
          editingCategory.id,
          editingCategory.updatedAt,
          { ...body, imagePath },
        );
      } else {
        saved = await createMenuCategory(sessionToken, body);
        if (categoryImageFile) {
          const imagePath = await uploadCategoryImage(
            sessionToken,
            saved.id,
            categoryImageFile,
          );
          saved = await updateMenuCategory(
            sessionToken,
            saved.id,
            saved.updatedAt,
            { ...body, imagePath },
          );
        }
      }
      if (
        editingCategory &&
        previousImagePath &&
        previousImagePath !== saved.imagePath
      ) {
        await removeCategoryImage(
          sessionToken,
          editingCategory.id,
          previousImagePath,
        ).catch(() => undefined);
      }
      setCategories((current) =>
        editingCategory
          ? current.map((category) =>
              category.id === editingCategory.id ? saved : category,
            )
          : [...current, saved],
      );
      setCategoryOpen(false);
      setNotice(
        t(
          editingCategory ? 'Category updated.' : 'Category added.',
          editingCategory ? 'تم تحديث القسم.' : 'تمت إضافة القسم.',
        ),
      );
    } catch (err) {
      setCategoryError(translateError(err));
    } finally {
      setCategorySaving(false);
    }
  }
  async function removeCategory() {
    if (!categoryToDelete || categorySaving) return;
    setCategorySaving(true);
    setCategoryError('');
    setNotice('');
    setError('');
    try {
      if (categoryToDelete.imagePath) {
        await removeCategoryImage(
          sessionToken,
          categoryToDelete.id,
          categoryToDelete.imagePath,
        );
      }
      await deleteMenuCategory(
        sessionToken,
        categoryToDelete.id,
        categoryToDelete.updatedAt,
      );
      setCategories((current) =>
        current.filter((category) => category.id !== categoryToDelete.id),
      );
      if (filter === categoryToDelete.id) setFilter('all');
      setCategoryToDelete(null);
      setNotice(t('Category removed.', 'تم حذف القسم.'));
    } catch (err) {
      setCategoryError(translateError(err));
    } finally {
      setCategorySaving(false);
    }
  }
  async function signOut() {
    onSessionEnded();
    await logoutAdmin(sessionToken).catch(() => undefined);
  }
  const visible =
    filter === 'all' ? items : items.filter((i) => i.category === filter);
  return (
    <DirectionProvider direction={ar ? 'rtl' : 'ltr'}>
      <div className="admin-shell" dir={ar ? 'rtl' : 'ltr'}>
        <header className="admin-header">
          <Link className="wordmark" href="/">
            <span>
              HILAL <span className="wordmark-light">OVEN</span>
            </span>
            <span className="wordmark-ar">
              {t('MENU MANAGEMENT', 'إدارة القائمة')}
            </span>
          </Link>
          <div className="admin-header-actions">
            <div className="language-control">
              <button onClick={() => setLang('en')} aria-pressed={!ar}>
                EN
              </button>
              <span />
              <button onClick={() => setLang('ar')} aria-pressed={ar} lang="ar">
                عربي
              </button>
            </div>
            <button
              type="button"
              className="icon-link"
              aria-label={t('Sign out', 'تسجيل الخروج')}
              onClick={() => void signOut()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="admin-main">
          <div className="admin-title-row">
            <div>
              <span className="eyebrow">{t('HILAL OVEN', 'فرن هلال')}</span>
              <h1>{t('Your menu', 'قائمتك')}</h1>
              <p>
                {t(
                  'Add the things you make. Keep prices up to date.',
                  'أضف أصناف الفرن وحدّث أسعارها.',
                )}
              </p>
            </div>
            <Button
              className="action-button"
              onClick={startAdd}
              disabled={loading || loadError || !categories.length}
            >
              <Plus size={18} />
              {t('Add item', 'إضافة صنف')}
            </Button>
          </div>
          <div className="admin-tools">
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} />
              {t('View menu', 'عرض القائمة')}
            </a>
            <a href="/hilal-oven-qr.png" download="Hilal-Oven-QR.png">
              <QrCode size={17} />
              {t('Download QR', 'تنزيل رمز QR')}
            </a>
            <Button
              variant="ghost"
              className="refresh-button"
              onClick={reload}
              disabled={loading || !!busy || saving}
            >
              <RefreshCw size={16} />
              {t('Refresh', 'تحديث')}
            </Button>
          </div>
          <section className="admin-category-manager">
            <div className="admin-section-top">
              <div>
                <span className="eyebrow">
                  {t('ORGANIZATION', 'تنظيم القائمة')}
                </span>
                <h2>
                  {t('Categories', 'الأقسام')} <span>{categories.length}</span>
                </h2>
              </div>
              <Button
                variant="outline"
                onClick={startAddCategory}
                disabled={loading || loadError || categorySaving}
              >
                <Plus size={16} />
                {t('Add category', 'إضافة قسم')}
              </Button>
            </div>
            {loading ? null : categories.length ? (
              <div className="admin-category-list">
                {categories.map((category) => (
                  <div className="admin-category-row" key={category.id}>
                    <Tags size={17} />
                    <div>
                      <strong>{ar ? category.nameAr : category.nameEn}</strong>
                      <span dir={ar ? 'ltr' : 'rtl'} lang={ar ? 'en' : 'ar'}>
                        {ar ? category.nameEn : category.nameAr}
                      </span>
                    </div>
                    <div className="item-edit-controls">
                      <Button
                        variant="outline"
                        disabled={categorySaving || saving}
                        onClick={() => startEditCategory(category)}
                      >
                        <Pencil size={16} />
                        {t('Edit', 'تعديل')}
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={categorySaving || saving}
                        onClick={() => {
                          setCategoryToDelete(category);
                          setCategoryError('');
                        }}
                        aria-label={t(
                          `Delete ${category.nameEn}`,
                          `حذف ${category.nameAr}`,
                        )}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-category-empty">
                {t(
                  'Create a category before adding menu items.',
                  'أنشئ قسماً قبل إضافة أصناف القائمة.',
                )}
              </p>
            )}
          </section>
          {notice && (
            <output className="notice success">
              <Check size={17} />
              {notice}
            </output>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <section className="admin-menu-section">
            <div className="admin-section-top">
              <h2>
                {t('Menu items', 'أصناف القائمة')} <span>{items.length}</span>
              </h2>
              <span>{t('Prices in LBP', 'الأسعار بالليرة اللبنانية')}</span>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(String(v))}>
              <div className="admin-category-scroll">
                <TabsList className="admin-categories">
                  <TabsTrigger value="all" className="category-tab">
                    {t('All items', 'كل الأصناف')}
                  </TabsTrigger>
                  {categories.map((c) => (
                    <TabsTrigger
                      className="category-tab"
                      key={c.id}
                      value={c.id}
                    >
                      {ar ? c.nameAr : c.nameEn}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
            {loading ? (
              <output className="state-message block">
                {t('Loading your items…', 'جارٍ تحميل الأصناف…')}
              </output>
            ) : loadError ? (
              <Empty className="admin-empty">
                <EmptyTitle>
                  {t('Your menu could not load', 'تعذّر تحميل القائمة')}
                </EmptyTitle>
                <EmptyDescription>
                  {t(
                    'Please try again. Your saved items are safe.',
                    'يرجى المحاولة مجدداً. أصنافك المحفوظة لم تتغيّر.',
                  )}
                </EmptyDescription>
                <Button className="action-button" onClick={reload}>
                  {t('Try again', 'حاول مجدداً')}
                </Button>
              </Empty>
            ) : !visible.length ? (
              <Empty className="admin-empty">
                <EmptyHeader>
                  <Wheat size={32} strokeWidth={1.2} />
                  <EmptyTitle>
                    {t('Ready for your first item', 'جاهزون لإضافة أول صنف')}
                  </EmptyTitle>
                  <EmptyDescription>
                    {t(
                      'Add its Arabic and English names, a category, and its price.',
                      'أضف اسمه بالعربية والإنجليزية وقسمه وسعره.',
                    )}
                  </EmptyDescription>
                </EmptyHeader>
                <Button onClick={startAdd} className="action-button">
                  <Plus size={17} />
                  {t('Add item', 'إضافة صنف')}
                </Button>
              </Empty>
            ) : (
              <div className="admin-item-list">
                {visible.map((item) => (
                  <article key={item.id} className="admin-item">
                    <div className="admin-item-detail">
                      <span className="admin-item-category">
                        {(() => {
                          const category = categories.find(
                            (c) => c.id === item.category,
                          );
                          return category
                            ? ar
                              ? category.nameAr
                              : category.nameEn
                            : item.category;
                        })()}
                      </span>
                      <h3>{ar ? item.nameAr : item.nameEn}</h3>
                      <p dir={ar ? 'ltr' : 'rtl'} lang={ar ? 'en' : 'ar'}>
                        {ar ? item.nameEn : item.nameAr}
                      </p>
                      <span className="admin-price">
                        {item.variants.length
                          ? t(
                              `${item.variants.length} sizes · from ${formatPrice(Math.min(...item.variants.map((variant) => variant.priceLbp)), lang)}`,
                              `${item.variants.length} أحجام · ابتداءً من ${formatPrice(Math.min(...item.variants.map((variant) => variant.priceLbp)), lang)}`,
                            )
                          : formatPrice(item.priceLbp, lang)}
                      </span>
                    </div>
                    <div className="admin-item-controls">
                      <label className="availability-control">
                        <Switch
                          checked={item.available}
                          disabled={!!busy || saving}
                          onCheckedChange={(checked) => toggle(item, checked)}
                          aria-label={t(
                            `Availability of ${item.nameEn}`,
                            `توفّر ${item.nameAr}`,
                          )}
                        />
                        <span>
                          {item.available
                            ? t('Available', 'متوفر')
                            : t('Unavailable', 'غير متوفر')}
                        </span>
                      </label>
                      <div className="item-edit-controls">
                        <Button
                          variant="outline"
                          disabled={!!busy || saving}
                          onClick={() => startEdit(item)}
                          aria-label={t(
                            `Edit ${item.nameEn}`,
                            `تعديل ${item.nameAr}`,
                          )}
                        >
                          <Pencil size={16} />
                          {t('Edit', 'تعديل')}
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={!!busy || saving}
                          onClick={() => {
                            setToDelete(item);
                            setFormError('');
                          }}
                          aria-label={t(
                            `Delete ${item.nameEn}`,
                            `حذف ${item.nameAr}`,
                          )}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <footer className="admin-bottom">
            <span>{t('Admin session active', 'جلسة المسؤول مفعّلة')}</span>
            <span>HILAL OVEN</span>
          </footer>
        </main>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            if (!saving) setOpen(value);
          }}
        >
          <DialogContent
            className="item-dialog"
            dir={ar ? 'rtl' : 'ltr'}
            showCloseButton={!saving}
          >
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? t('Edit item', 'تعديل الصنف')
                  : t('Add an item', 'إضافة صنف')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'Names in both languages are required. Descriptions are optional.',
                  'الاسم باللغتين مطلوب. الوصف اختياري.',
                )}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="item-form">
              <div className="form-columns">
                <label>
                  {t('English name', 'الاسم بالإنجليزية')}
                  <input
                    value={draft.nameEn}
                    onChange={(e) =>
                      setDraft({ ...draft, nameEn: e.target.value })
                    }
                    required
                    maxLength={120}
                    dir="ltr"
                    lang="en"
                    disabled={saving}
                  />
                </label>
                <label>
                  {t('Arabic name', 'الاسم بالعربية')}
                  <input
                    value={draft.nameAr}
                    onChange={(e) =>
                      setDraft({ ...draft, nameAr: e.target.value })
                    }
                    required
                    maxLength={120}
                    dir="rtl"
                    lang="ar"
                    disabled={saving}
                  />
                </label>
              </div>
              <div className="form-columns">
                <div className="form-field">
                  <label id="category-label">{t('Category', 'القسم')}</label>
                  <Select
                    value={draft.category}
                    onValueChange={(value) => {
                      if (value) setDraft({ ...draft, category: value });
                    }}
                    disabled={saving}
                  >
                    <SelectTrigger
                      className="form-select"
                      aria-labelledby="category-label"
                    >
                      <SelectValue>
                        {(() => {
                          const category = categories.find(
                            (c) => c.id === draft.category,
                          );
                          return category
                            ? ar
                              ? category.nameAr
                              : category.nameEn
                            : '';
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {ar ? c.nameAr : c.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!draft.variants.length && (
                  <label>
                    {t('Price (LBP)', 'السعر (ل.ل.)')}
                    <input
                      type="number"
                      inputMode="numeric"
                      value={draft.price}
                      onChange={(e) =>
                        setDraft({ ...draft, price: e.target.value })
                      }
                      required
                      min={1}
                      max={1000000000}
                      step={1}
                      dir="ltr"
                      disabled={saving}
                    />
                  </label>
                )}
              </div>
              <section className="variant-editor">
                <div className="variant-editor-heading">
                  <div>
                    <strong>{t('Size variants', 'خيارات الحجم')}</strong>
                    <span>
                      {t(
                        'Optional. Add a price for each size.',
                        'اختياري. أضف سعراً لكل حجم.',
                      )}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || draft.variants.length >= 12}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        variants: [
                          ...draft.variants,
                          { nameEn: '', nameAr: '', price: '' },
                        ],
                      })
                    }
                  >
                    <Plus size={15} />
                    {t('Add size', 'إضافة حجم')}
                  </Button>
                </div>
                {draft.variants.map((variant, index) => (
                  <div className="variant-row" key={index}>
                    <label>
                      {t('Size in English', 'الحجم بالإنجليزية')}
                      <input
                        value={variant.nameEn}
                        maxLength={60}
                        required
                        dir="ltr"
                        disabled={saving}
                        placeholder="Small"
                        onChange={(event) => {
                          const variants = [...draft.variants];
                          variants[index] = {
                            ...variant,
                            nameEn: event.target.value,
                          };
                          setDraft({ ...draft, variants });
                        }}
                      />
                    </label>
                    <label>
                      {t('Size in Arabic', 'الحجم بالعربية')}
                      <input
                        value={variant.nameAr}
                        maxLength={60}
                        required
                        dir="rtl"
                        disabled={saving}
                        placeholder="صغير"
                        onChange={(event) => {
                          const variants = [...draft.variants];
                          variants[index] = {
                            ...variant,
                            nameAr: event.target.value,
                          };
                          setDraft({ ...draft, variants });
                        }}
                      />
                    </label>
                    <label>
                      {t('Price (LBP)', 'السعر (ل.ل.)')}
                      <input
                        type="number"
                        inputMode="numeric"
                        value={variant.price}
                        min={1}
                        max={1000000000}
                        step={1}
                        required
                        dir="ltr"
                        disabled={saving}
                        onChange={(event) => {
                          const variants = [...draft.variants];
                          variants[index] = {
                            ...variant,
                            price: event.target.value,
                          };
                          setDraft({ ...draft, variants });
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={saving}
                      aria-label={t(
                        `Remove size ${index + 1}`,
                        `حذف الحجم ${index + 1}`,
                      )}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          variants: draft.variants.filter(
                            (_, variantIndex) => variantIndex !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </section>
              <label>
                {t('English description', 'الوصف بالإنجليزية')}
                <textarea
                  value={draft.descriptionEn}
                  onChange={(e) =>
                    setDraft({ ...draft, descriptionEn: e.target.value })
                  }
                  maxLength={500}
                  rows={2}
                  dir="ltr"
                  lang="en"
                  disabled={saving}
                />
              </label>
              <label>
                {t('Arabic description', 'الوصف بالعربية')}
                <textarea
                  value={draft.descriptionAr}
                  onChange={(e) =>
                    setDraft({ ...draft, descriptionAr: e.target.value })
                  }
                  maxLength={500}
                  rows={2}
                  dir="rtl"
                  lang="ar"
                  disabled={saving}
                />
              </label>
              <label className="form-availability" htmlFor="item-available">
                <div>
                  <strong>{t('Available', 'متوفر')}</strong>
                  <span>
                    {t(
                      'Turn off when this item is sold out.',
                      'أوقف الخيار عندما ينفد هذا الصنف.',
                    )}
                  </span>
                </div>
                <Switch
                  id="item-available"
                  checked={draft.available}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, available: checked })
                  }
                  disabled={saving}
                  aria-label={t('Item available', 'الصنف متوفر')}
                />
              </label>
              {formError && (
                <p className="notice error" role="alert">
                  {formError}
                </p>
              )}
              <div className="form-actions">
                <Button
                  variant="outline"
                  type="button"
                  disabled={saving}
                  onClick={() => setOpen(false)}
                >
                  {t('Cancel', 'إلغاء')}
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="action-button"
                >
                  {saving
                    ? t('Saving…', 'جارٍ الحفظ…')
                    : t('Save item', 'حفظ الصنف')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={categoryOpen}
          onOpenChange={(value) => {
            if (!categorySaving) setCategoryOpen(value);
          }}
        >
          <DialogContent
            className="item-dialog category-dialog"
            dir={ar ? 'rtl' : 'ltr'}
            showCloseButton={!categorySaving}
          >
            <DialogHeader>
              <DialogTitle>
                {editingCategory
                  ? t('Edit category', 'تعديل القسم')
                  : t('Add a category', 'إضافة قسم')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'Categories organize both your customer menu and item editor.',
                  'تُنظّم الأقسام قائمة الزبائن ومحرّر الأصناف.',
                )}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={saveCategory} className="item-form">
              <div className="form-columns">
                <label>
                  {t('English name', 'الاسم بالإنجليزية')}
                  <input
                    value={categoryDraft.nameEn}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        nameEn: event.target.value,
                      })
                    }
                    required
                    maxLength={80}
                    dir="ltr"
                    lang="en"
                    disabled={categorySaving}
                  />
                </label>
                <label>
                  {t('Arabic name', 'الاسم بالعربية')}
                  <input
                    value={categoryDraft.nameAr}
                    onChange={(event) =>
                      setCategoryDraft({
                        ...categoryDraft,
                        nameAr: event.target.value,
                      })
                    }
                    required
                    maxLength={80}
                    dir="rtl"
                    lang="ar"
                    disabled={categorySaving}
                  />
                </label>
              </div>
              <label>
                {t('Category image', 'صورة القسم')}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setCategoryImageFile(event.target.files?.[0] ?? null)
                  }
                  disabled={categorySaving}
                />
                <span className="file-input-help">
                  {t(
                    'JPG, PNG, or WebP, up to 5 MB. Leave empty to keep the current image.',
                    'JPG أو PNG أو WebP، حتى 5 ميغابايت. اتركه فارغاً للاحتفاظ بالصورة الحالية.',
                  )}
                </span>
              </label>
              {categoryImageFile && (
                <p className="selected-image-file">
                  {t('New image:', 'الصورة الجديدة:')} {categoryImageFile.name}
                </p>
              )}
              {categoryDraft.imagePath && !categoryImageFile && (
                <div className="category-image-preview">
                  <div
                    className="category-image-preview-photo"
                    aria-hidden="true"
                    style={{
                      backgroundImage: `url("${categoryImageUrl(categoryDraft.imagePath)}")`,
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={categorySaving}
                    onClick={() =>
                      setCategoryDraft({ ...categoryDraft, imagePath: null })
                    }
                  >
                    {t('Remove image', 'حذف الصورة')}
                  </Button>
                </div>
              )}
              {categoryError && (
                <p className="notice error" role="alert">
                  {categoryError}
                </p>
              )}
              <div className="form-actions">
                <Button
                  variant="outline"
                  type="button"
                  disabled={categorySaving}
                  onClick={() => setCategoryOpen(false)}
                >
                  {t('Cancel', 'إلغاء')}
                </Button>
                <Button
                  type="submit"
                  disabled={categorySaving}
                  className="action-button"
                >
                  {categorySaving
                    ? t('Saving…', 'جارٍ الحفظ…')
                    : editingCategory
                      ? t('Save category', 'حفظ القسم')
                      : t('Add category', 'إضافة قسم')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <AlertDialog
          open={!!toDelete}
          onOpenChange={(value) => {
            if (!value && !saving) setToDelete(null);
          }}
        >
          <AlertDialogContent
            dir={ar ? 'rtl' : 'ltr'}
            className="delete-dialog"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('Remove this item?', 'حذف هذا الصنف؟')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  `“${toDelete?.nameEn ?? ''}” will be removed from the customer menu. You can mark it unavailable instead if it is only sold out.`,
                  `سيُحذف «${toDelete?.nameAr ?? ''}» من قائمة الزبائن. يمكنك جعله غير متوفر إذا كان قد نفد مؤقتاً.`,
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {formError && (
              <p className="notice error" role="alert">
                {formError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>
                {t('Keep item', 'الاحتفاظ بالصنف')}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={saving}
                onClick={remove}
              >
                {saving
                  ? t('Removing…', 'جارٍ الحذف…')
                  : t('Remove item', 'حذف الصنف')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={!!categoryToDelete}
          onOpenChange={(value) => {
            if (!value && !categorySaving) setCategoryToDelete(null);
          }}
        >
          <AlertDialogContent
            dir={ar ? 'rtl' : 'ltr'}
            className="delete-dialog"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('Remove this category?', 'حذف هذا القسم؟')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  `“${categoryToDelete?.nameEn ?? ''}” can only be removed when it has no menu items. Move or remove its items first.`,
                  `لا يمكن حذف «${categoryToDelete?.nameAr ?? ''}» إلا إذا لم يحتوِ على أصناف. انقل الأصناف أو احذفها أولاً.`,
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {categoryError && (
              <p className="notice error" role="alert">
                {categoryError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={categorySaving}>
                {t('Keep category', 'الاحتفاظ بالقسم')}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={categorySaving}
                onClick={removeCategory}
              >
                {categorySaving
                  ? t('Removing…', 'جارٍ الحذف…')
                  : t('Remove category', 'حذف القسم')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DirectionProvider>
  );
}
