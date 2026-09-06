import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import {
  getChatGPTUser,
  chatGPTSignInPath,
  chatGPTSignOutPath,
} from '@/app/chatgpt-auth';
import { isAdmin } from '@/lib/admin-auth';
import AdminDashboard from './dashboard';
import { LockKeyhole, ArrowLeft, ArrowUpRight } from 'lucide-react';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Manage menu | Hilal Oven',
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  const user = await getChatGPTUser();
  if (isAdmin(user))
    return (
      <AdminDashboard
        email={user!.email}
        signOutPath={chatGPTSignOutPath('/admin')}
      />
    );
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
        {user ? (
          <>
            <p>
              This account does not have admin access. Sign in with the email
              assigned to manage this menu.
            </p>
            <p lang="ar" dir="rtl">
              هذا الحساب غير مخوّل لإدارة القائمة. يرجى استخدام حساب المسؤول.
            </p>
            <a
              className="primary-link"
              href={chatGPTSignOutPath('/admin')}
              target="_top"
            >
              Use another account
              <ArrowUpRight size={17} />
            </a>
          </>
        ) : (
          <>
            <p>Sign in to add items, update prices, and manage availability.</p>
            <p lang="ar" dir="rtl">
              سجّل الدخول لإضافة الأصناف وتعديل الأسعار والتوفّر.
            </p>
            <a
              className="primary-link"
              href={chatGPTSignInPath('/admin')}
              target="_top"
            >
              Sign in with ChatGPT
              <ArrowUpRight size={17} />
            </a>
          </>
        )}
        <span className="owner-only">
          For the menu administrator · للمسؤول فقط
        </span>
      </section>
    </main>
  );
}
