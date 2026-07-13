import Head from 'next/head';
import type { ReactNode } from 'react';

type DefaultLayoutProps = { children: ReactNode };

export const DefaultLayout = ({ children }: DefaultLayoutProps) => {
  return (
    <>
      <Head>
        <title>权限控制台</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen">{children}</main>
    </>
  );
};
