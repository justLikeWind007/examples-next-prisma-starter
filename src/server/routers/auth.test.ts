import { randomUUID } from 'node:crypto';
import { auth } from '../auth';
import { prisma } from '../prisma';
import { createContextInner } from '../context';
import { createCaller } from './_app';

test('registers a user with valid input', async () => {
  const caller = createCaller(await createContextInner({}));
  const email = `register-${randomUUID()}@example.com`;

  const user = await caller.auth.register({
    name: 'New Operator',
    email: email.toUpperCase(),
    password: 'a valid training password',
  });

  expect(user).toMatchObject({
    name: 'New Operator',
    email,
    enabled: true,
  });
  expect(user).not.toHaveProperty('password');
});

test('rejects a duplicate normalized email with a stable conflict', async () => {
  const caller = createCaller(await createContextInner({}));
  const email = `duplicate-${randomUUID()}@example.com`;
  const input = {
    name: 'Duplicate Operator',
    email,
    password: 'another valid training password',
  };

  await caller.auth.register(input);

  await expect(
    caller.auth.register({ ...input, email: email.toUpperCase() }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'EMAIL_ALREADY_REGISTERED',
  });
});

test('uses the login credential on a subsequent authenticated call', async () => {
  const anonymousCaller = createCaller(await createContextInner({}));
  const email = `login-${randomUUID()}@example.com`;
  const password = 'a reusable training password';
  await anonymousCaller.auth.register({
    name: 'Session Operator',
    email,
    password,
  });

  const login = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const setCookie = login.headers.get('set-cookie');
  expect(login.response.token).toBeTruthy();
  expect(setCookie).toContain('better-auth.session_token');
  if (!setCookie) throw new Error('Login did not return a session cookie');

  const headers = new Headers({ cookie: setCookie.split(';')[0] });
  const authenticatedCaller = createCaller(
    await createContextInner({ headers }),
  );

  await expect(authenticatedCaller.auth.me()).resolves.toMatchObject({
    email,
    enabled: true,
  });
});

test('does not distinguish unknown, wrong-password, and disabled login', async () => {
  const caller = createCaller(await createContextInner({}));
  const email = `disabled-${randomUUID()}@example.com`;
  const password = 'a disabled training password';
  const user = await caller.auth.register({
    name: 'Disabled Operator',
    email,
    password,
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { enabled: false },
  });

  async function loginFailure(loginEmail: string, loginPassword: string) {
    try {
      await auth.api.signInEmail({
        body: { email: loginEmail, password: loginPassword },
      });
      return null;
    } catch (error) {
      const failure = error as {
        statusCode?: number;
        body?: { code?: string; message?: string };
      };
      return {
        statusCode: failure.statusCode,
        code: failure.body?.code,
        message: failure.body?.message,
      };
    }
  }

  const wrongPassword = await loginFailure(email, 'a wrong training password');
  const unknownUser = await loginFailure(
    `unknown-${randomUUID()}@example.com`,
    password,
  );
  const disabledUser = await loginFailure(email, password);

  expect(wrongPassword).toMatchObject({ statusCode: 401 });
  expect(unknownUser).toEqual(wrongPassword);
  expect(disabledUser).toEqual(wrongPassword);
});
