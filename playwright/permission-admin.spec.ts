import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL('/');
}

test.describe.serial('permission administration assessment', () => {
  test('administrator can authenticate and access all modules', async ({
    page,
  }, testInfo) => {
    await login(page, 'admin@example.com', 'PermissionAdmin2026!');

    for (const label of ['用户', '角色', '权限点', '区域', '公告']) {
      await expect(
        page.getByRole('button', { name: label, exact: true }),
      ).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();
    await expect(page.getByText('重庆区域编辑', { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('admin-desktop.png'),
      fullPage: true,
    });
  });

  test('user without permissions has no accessible module', async ({
    page,
  }) => {
    await login(page, 'limited@example.com', 'LimitedAccess2026!');

    await expect(page.getByText('当前账号没有可用模块')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '用户', exact: true }),
    ).toHaveCount(0);
  });

  test('regional editor cannot observe Beijing announcements', async ({
    page,
  }, testInfo) => {
    await login(page, 'editor@example.com', 'RegionalEditor2026!');
    await page.getByRole('button', { name: '公告', exact: true }).click();

    await expect(page.getByRole('heading', { name: '区域公告' })).toBeVisible();
    await expect(
      page.getByText('重庆研发培训通知', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('北京研发培训通知', { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: '发布公告' })).toBeEnabled();
    await page.screenshot({
      path: testInfo.outputPath('editor-scope.png'),
      fullPage: true,
    });
  });

  test('announcement workspace remains usable on a mobile viewport', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, 'viewer@example.com', 'AnnouncementViewer2026!');

    await expect(page.getByRole('heading', { name: '区域公告' })).toBeVisible();
    await expect(
      page.getByText('北京研发培训通知', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('重庆研发培训通知', { exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('viewer-mobile.png'),
      fullPage: true,
    });
  });

  test('user-side assignments are visible from role and region views', async ({
    page,
  }) => {
    await login(page, 'admin@example.com', 'PermissionAdmin2026!');
    await page.getByRole('button', { name: '编辑 无权限用户' }).click();
    const dialog = page.getByRole('dialog', { name: '编辑用户' });
    await dialog.getByLabel('公告只读').check();
    await dialog.getByLabel('北京').check();
    await dialog.getByRole('button', { name: '保存' }).click();
    await expect(dialog).toHaveCount(0);

    await page.getByRole('button', { name: '角色', exact: true }).click();
    const viewerRoleRow = page
      .getByRole('row')
      .filter({ hasText: 'announcement-viewer' });
    await expect(viewerRoleRow).toContainText('无权限用户');

    await page.getByRole('button', { name: '区域', exact: true }).click();
    const beijingRow = page.getByRole('row').filter({
      has: page.getByText('beijing', { exact: true }),
    });
    await expect(beijingRow).toContainText('无权限用户');
  });
});
