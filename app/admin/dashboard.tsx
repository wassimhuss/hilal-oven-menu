'use client';
import Link from 'next/link';
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
import {
  categories,
  formatPrice,
  type MenuItem,
  type CategoryId,
} from '@/lib/menu';

type Draft = {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: CategoryId;
  price: string;
  available: boolean;
};
const newDraft = (category: string): Draft => ({
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  category: categories.some((c) => c.id === category)
    ? (category as CategoryId)
    : 'manakish',
  price: '',
  available: true,
});
class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function request(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
  });
  const data = (await response.json().catch(() => ({}))) as {
    items: MenuItem[];
    item: MenuItem;
    error?: string;
  };
  if (!response.ok)
    throw new RequestError(
      response.status,
      data.error || 'The request failed. Please try again.',
    );
  return data;
}
export default function AdminDashboard({
  email,
  signOutPath,
}: {
  email: string;
  signOutPath: string;
}) {
  const [lang, setLang] = useLanguage();
  const ar = lang === 'ar';
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [draft, setDraft] = useState<Draft>(newDraft('manakish'));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MenuItem | null>(null);
  const [formError, setFormError] = useState('');
  const translateError = (err: unknown) => {
    if (err instanceof RequestError && err.status === 409)
      return t(
        'This item changed in another session. Close this form, refresh, and try again.',
        'تم تعديل هذا الصنف في جلسة أخرى. أغلق النافذة وحدّث القائمة ثم حاول مجدداً.',
      );
    if (
      err instanceof RequestError &&
      (err.status === 401 || err.status === 403)
    )
      return t(
        'Your session has ended or this account does not have access. Sign out and sign in again.',
        'انتهت الجلسة أو ليس لهذا الحساب صلاحية. سجّل الخروج ثم الدخول مجدداً.',
      );
    return t(
      err instanceof Error ? err.message : 'Please try again.',
      'تعذّر حفظ التغيير. تحقق من اتصالك وحاول مجدداً.',
    );
  };
  const refresh = useCallback(async () => {
    try {
      const data = await request('/api/admin/items');
      setItems(data.items);
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
    let active = true;
    void request('/api/admin/items')
      .then((data) => {
        if (active) {
          setItems(data.items);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const startAdd = () => {
    setEditing(null);
    setDraft(newDraft(filter));
    setFormError('');
    setOpen(true);
  };
  const startEdit = (item: MenuItem) => {
    setEditing(item);
    setDraft({ ...item, price: String(item.priceLbp) });
    setFormError('');
    setOpen(true);
  };
  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const price = Number(draft.price);
    if (
      !draft.nameEn.trim() ||
      !draft.nameAr.trim() ||
      !draft.price.trim() ||
      !Number.isSafeInteger(price) ||
      price <= 0 ||
      price > 1_000_000_000
    ) {
      setFormError(
        t(
          'Add a name in both languages and a valid whole-number LBP price.',
          'أدخل الاسم باللغتين وسعراً صحيحاً بالليرة اللبنانية.',
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
      priceLbp: price,
      available: draft.available,
      ...(editing ? { updatedAt: editing.updatedAt } : {}),
    };
    try {
      const data = await request(
        editing ? `/api/admin/items/${editing.id}` : '/api/admin/items',
        editing ? 'PUT' : 'POST',
        body,
      );
      if (editing)
        setItems((current) =>
          current.map((i) =>
            i.id === editing.id ? { ...i, ...data.item } : i,
          ),
        );
      else setItems((current) => [...current, data.item]);
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
      const data = await request(`/api/admin/items/${item.id}`, 'PUT', {
        ...item,
        available,
      });
      setItems((current) =>
        current.map((i) => (i.id === item.id ? { ...i, ...data.item } : i)),
      );
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
      await request(`/api/admin/items/${toDelete.id}`, 'DELETE', {
        updatedAt: toDelete.updatedAt,
      });
      setItems((current) => current.filter((i) => i.id !== toDelete.id));
      setToDelete(null);
      setNotice(t('Item removed from the menu.', 'تم حذف الصنف من القائمة.'));
    } catch (err) {
      setFormError(translateError(err));
    } finally {
      setSaving(false);
    }
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
            <a
              href={signOutPath}
              target="_top"
              className="icon-link"
              aria-label={t('Sign out', 'تسجيل الخروج')}
            >
              <LogOut size={18} />
            </a>
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
              disabled={loading || loadError}
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
                      {c[lang]}
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
                        {categories.find((c) => c.id === item.category)?.[lang]}
                      </span>
                      <h3>{ar ? item.nameAr : item.nameEn}</h3>
                      <p dir={ar ? 'ltr' : 'rtl'} lang={ar ? 'en' : 'ar'}>
                        {ar ? item.nameEn : item.nameAr}
                      </p>
                      <span className="admin-price">
                        {formatPrice(item.priceLbp, lang)}
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
            <span>
              {t('Signed in as', 'تم تسجيل الدخول باسم')} <bdi>{email}</bdi>
            </span>
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
                      if (value)
                        setDraft({ ...draft, category: value as CategoryId });
                    }}
                    disabled={saving}
                  >
                    <SelectTrigger
                      className="form-select"
                      aria-labelledby="category-label"
                    >
                      <SelectValue>
                        {
                          categories.find((c) => c.id === draft.category)?.[
                            lang
                          ]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c[lang]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              </div>
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
      </div>
    </DirectionProvider>
  );
}
