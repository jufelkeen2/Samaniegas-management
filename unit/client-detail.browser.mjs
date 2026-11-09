// Run after npm run build. Serves only the built UI; all API data is mocked.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const path = pathname.startsWith('/_next/static/') ? resolve('.next/static', pathname.slice(14)) : pathname === '/clientes' ? resolve('.next/server/app/clientes.html') : resolve('public', pathname.slice(1));
    if (!path.startsWith(resolve('.next')) && !path.startsWith(resolve('public'))) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', path.endsWith('.js') ? 'application/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const client = { id: 'a', name: 'Cliente de prueba', phone: '2065550100', address: 'Seattle, WA', notes: 'Cerrar la puerta del jardín.', servicePrice: 150, paymentDay: 15, visitDay1: 7, visitDay2: 21, active: true, pendingBalance: 150, _count: { visits: 2 } };
    const payments = [{ id: 'p1', clientId: 'a', amount: 150, dueDate: '2026-10-15', paymentDate: null, status: 'PENDING', notes: 'Octubre' }];
    let saves = 0;
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      let data;
      if (url.pathname === '/api/clients') data = [client];
      else if (url.pathname === '/api/payments/p1') {
        assert.equal(route.request().method(), 'PATCH');
        const body = route.request().postDataJSON();
        assert.equal(body.clientId, 'a');
        saves++; Object.assign(payments[0], body, { amount: Number(body.amount) }); client.pendingBalance = 0; data = payments[0];
        await new Promise(resolve => setTimeout(resolve, 150));
      } else if (url.pathname === '/api/payments') {
        assert.equal(url.searchParams.get('clientId'), 'a');
        assert.equal(url.searchParams.get('history'), 'all'); data = payments;
      } else if (url.pathname === '/api/visits') data = [{ id: 'v1', scheduledDate: '2026-11-07', completed: true, actualDate: '2026-11-07', notes: 'Servicio completado' }];
      else data = {};
      await route.fulfill({ json: data });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/clientes`);
    await page.getByRole('button', { name: 'Ver ficha de Cliente de prueba' }).click();
    const dialog = page.getByRole('dialog'); await dialog.waitFor({ state: 'visible' });
    await dialog.getByRole('button', { name: 'Confirmar pago', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirmar y guardar' }).click();
    await dialog.getByRole('status').waitFor();
    assert.equal(saves, 1); assert.equal(payments.length, 1); assert.equal(payments[0].status, 'PAID');
    await dialog.getByRole('button', { name: 'Editar pago', exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Información', exact: true }).click();
    await dialog.getByText('Cerrar la puerta del jardín.').waitFor();
    await dialog.getByRole('button', { name: 'Servicios', exact: true }).click();
    await dialog.getByText('Servicio completado', { exact: true }).waitFor();
    assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    await page.getByLabel('Filtrar por saldo').selectOption('PENDING');
    await page.getByText('No hay clientes', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS ${viewport.width}px: client modal, payment confirmation, refreshed balance, services, contact, Escape and pending filter`);
    await page.close();
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
