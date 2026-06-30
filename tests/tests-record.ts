//JOB CREATION
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
 await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Admin Backend' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'New job' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByLabel('Select customer *').selectOption('OP-001');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByLabel('Pickup from master data').selectOption('ADDR-001');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByLabel('Delivery from master data').selectOption('ADDR-016');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Pickup date \*$/ }).getByPlaceholder('DD.MM.YYYY').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Pickup date \*$/ }).getByPlaceholder('DD.MM.YYYY').fill('19.06.2026');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Pickup date \*$/ }).getByPlaceholder('DD.MM.YYYY').press('Tab');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).first().fill('20');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).first().press('Tab');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(1).fill('3');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(1).press('Tab');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Pickup date \*Window fromWindow untilFlexible$/ }).getByLabel('Flexible').press('Tab');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Delivery date \*$/ }).getByPlaceholder('DD.MM.YYYY').fill('17.07.2026');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Delivery date \*$/ }).getByPlaceholder('DD.MM.YYYY').press('Tab');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(2).fill('20');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(2).press('Tab');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(3).fill('23');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(3).press('Tab');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(1).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(1).press('ArrowLeft');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(1).press('ArrowLeft');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(1).press('ArrowLeft');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(1).press('ArrowLeft');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '—:—' }).nth(1).fill('23:00');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByText('Car', { exact: true }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('combobox', { name: 'e.g. Volkswagen' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('combobox', { name: 'e.g. Volkswagen' }).fill('Skoda');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: 'e.g. Passat Variant' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: 'e.g. Passat Variant' }).fill('wdd');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: 'XX-XX' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: 'XX-XX' }).fill('wdwdwdwd');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: 'characters' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: 'characters' }).fill('WDWDWDWDWDWDWDWDWd');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '€' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: '€' }).fill('21');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Assign driver…' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Assign', exact: true }).click();
});

//PROFILE CHANGE REQUESTS

test('test', async ({ page }) => {
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Profile' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Request changes' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('#profile-mdr-address').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('#profile-mdr-address').fill('Landsger Str. 22, 80339 Munchen');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Submit change request' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Admin Backend' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Profile change requests' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Jordan Blake AU-41-0228 · 18.' }).click();
  //await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Reject request' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Approve changes' }).click();

});


//DRIVER PROFILE CREATION

test('test', async ({ page }) => {
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'New driver' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Name \*$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Name \*$/ }).getByRole('textbox').fill('Youssef Elkondakly');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Company \*$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Company \*$/ }).getByRole('textbox').fill('calibtos');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('input[type="tel"]').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('input[type="tel"]').fill('+201030841762');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: 'name@company.example' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: 'name@company.example' }).fill('youssefelkondakly@gmail.com');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Address$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Address$/ }).getByRole('textbox').fill('New Damietta The first district, 100 St the Sixth Block');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('textarea').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('textarea').fill('like follow sub');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Save' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Close' }).click();
});


//Customer Creation 

test('test', async ({ page }) => {
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Customers' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Add customer' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Name \*$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Name \*$/ }).getByRole('textbox').fill('Youssef elkondakly');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: 'Dealer, fleet, branch…' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('textbox', { name: 'Dealer, fleet, branch…' }).fill('Dealer');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Contact person$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Contact person$/ }).getByRole('textbox').fill('+201030841762');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Phone$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Phone$/ }).getByRole('textbox').fill('+201551334153');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Email$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Email$/ }).getByRole('textbox').fill('youssef.elkondakly@calibtos.com');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Billing notes$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Billing notes$/ }).getByRole('textbox').fill('a7a 5ara a7a 5ara');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Driver \/ dispatch instructions$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Driver \/ dispatch instructions$/ }).getByRole('textbox').fill('leave it alone with the key inside it ');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Save' }).click();
});

// add an address

test('test', async ({ page }) => {
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Addresses' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Add address' }).click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Location name \*$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Location name \*$/ }).getByRole('textbox').fill('Cairo festival city');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Street \*$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Street \*$/ }).getByRole('textbox').fill('northen tassen');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Postcode \*$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Postcode \*$/ }).getByRole('textbox').fill('34517');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^City \/ town \*$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^City \/ town \*$/ }).getByRole('textbox').fill('Cairo');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Country$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Country$/ }).getByRole('textbox').fill('EG');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Contact person$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Contact person$/ }).getByRole('textbox').fill('+201551334153');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Phone$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Phone$/ }).getByRole('textbox').fill('+201030841762');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Second phone$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Second phone$/ }).getByRole('textbox').fill('+201030841762');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Email$/ }).getByRole('textbox').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('div').filter({ hasText: /^Email$/ }).getByRole('textbox').fill('youssef.elkondakly@gmail.com');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('textarea').click();
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().locator('textarea').fill('Take care');
  await page.locator('iframe[title="AUTHEON Prototype"]').contentFrame().getByRole('button', { name: 'Save' }).click();
});