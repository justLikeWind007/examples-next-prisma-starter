import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { NextPageWithLayout } from './_app';
import { trpc } from '~/utils/trpc';
import { buttonPrimary, inputClass } from '~/components/admin/ui';

const RegisterPage: NextPageWithLayout = () => {
  const router = useRouter();
  const [error, setError] = useState('');
  const register = trpc.auth.register.useMutation();

  return (
    <>
      <Head>
        <title>注册 | 权限控制台</title>
      </Head>
      <main className="grid min-h-screen place-items-center bg-zinc-100 p-4">
        <section className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-7 shadow-sm">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded bg-cyan-700 text-white">
              <UserPlus size={21} />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-zinc-950">注册账号</h1>
              <p className="text-sm text-zinc-500">新账号默认没有任何权限</p>
            </div>
          </div>
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              const values = new FormData(event.currentTarget);
              const name = values.get('name');
              const email = values.get('email');
              const password = values.get('password');
              if (
                typeof name !== 'string' ||
                typeof email !== 'string' ||
                typeof password !== 'string'
              ) {
                setError('输入不合法，请重新填写');
                return;
              }
              try {
                await register.mutateAsync({ name, email, password });
                await router.push('/login?registered=1');
              } catch (cause) {
                const message = cause instanceof Error ? cause.message : '';
                setError(
                  message.includes('EMAIL_ALREADY_REGISTERED')
                    ? '该邮箱已经注册'
                    : '输入不合法，请检查姓名、邮箱和密码长度',
                );
              }
            }}
          >
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              姓名
              <input
                name="name"
                required
                maxLength={80}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              邮箱
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
              密码
              <input
                name="password"
                type="password"
                required
                minLength={15}
                maxLength={64}
                className={inputClass}
              />
              <span className="text-xs font-normal text-zinc-500">
                15-64 个字符，不限制字符组合
              </span>
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              className={buttonPrimary}
              disabled={register.isPending}
            >
              {register.isPending ? '注册中...' : '创建账号'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-zinc-500">
            已有账号？{' '}
            <Link
              href="/login"
              className="font-medium text-emerald-700 hover:underline"
            >
              返回登录
            </Link>
          </p>
        </section>
      </main>
    </>
  );
};

RegisterPage.getLayout = (page) => page;
export default RegisterPage;
