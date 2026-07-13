import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import type { NextPageWithLayout } from './_app';
import { authClient } from '~/utils/auth-client';
import { buttonPrimary, inputClass } from '~/components/admin/ui';

const LoginPage: NextPageWithLayout = () => {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('PermissionAdmin2026!');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  return (
    <>
      <Head>
        <title>登录 | 权限控制台</title>
      </Head>
      <main className="grid min-h-screen place-items-center bg-zinc-100 p-4">
        <section className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-7 shadow-sm">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded bg-emerald-600 text-white">
              <KeyRound size={21} />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-zinc-950">
                权限控制台
              </h1>
              <p className="text-sm text-zinc-500">使用账号密码登录</p>
            </div>
          </div>
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              setPending(true);
              const result = await authClient.signIn.email({ email, password });
              setPending(false);
              if (result.error) {
                setError('邮箱或密码错误，或该账号已被禁用');
                return;
              }
              await router.replace('/');
            }}
          >
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              邮箱
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              密码
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={15}
                maxLength={64}
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button type="submit" className={buttonPrimary} disabled={pending}>
              {pending ? '登录中...' : '登录'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-zinc-500">
            没有账号？{' '}
            <Link
              href="/register"
              className="font-medium text-emerald-700 hover:underline"
            >
              注册
            </Link>
          </p>
        </section>
      </main>
    </>
  );
};

LoginPage.getLayout = (page) => page;
export default LoginPage;
