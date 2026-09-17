import { expect, Page, test } from "@playwright/test";

async function login(page: Page) {
  const username = process.env.E2E_AUTH_USERNAME;
  const password = process.env.E2E_AUTH_PASSWORD;
  if (!username || !password) throw new Error("Faltan E2E_AUTH_USERNAME y E2E_AUTH_PASSWORD para las pruebas autenticadas");
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(username);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Resumen del negocio" })).toBeVisible();
}

test.beforeEach(async ({ page }) => { await login(page); });

test("carga las áreas principales sin errores de consola", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));

  const pages = [
    ["/", "Resumen del negocio"],
    ["/clientes", "Clientes"],
    ["/calendario", "Calendario de servicios"],
    ["/pagos", "Pagos"],
    ["/configuracion", "Configuración"],
  ];
  for (const [path, heading] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByText("Cargando información...")).toBeHidden({ timeout: 10_000 });
  }
  expect(errors).toEqual([]);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-configuracion.png`, fullPage: true });
});

test("muestra métricas, ejemplos y filtros operativos", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page.getByText("Clientes activos")).toBeVisible();
  await expect(page.getByText("Cobrado", { exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-inicio.png`, fullPage: true });
  await page.goto("/clientes");
  await expect(page.getByText(/Incluye visitas los días \d+ y \d+/).first()).toBeVisible();
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  await expect(page.getByLabel("Precio mensual (incluye las 2 visitas) (USD) *")).toBeVisible();
  await expect(page.getByLabel("Día de visita 1 *")).toHaveValue("7");
  await expect(page.getByLabel("Día de visita 2 *")).toHaveValue("21");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await expect(page.locator('input[name="name"]')).toHaveJSProperty("validity.valid", false);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: /^Editar / }).first().click();
  const firstVisitDay = await page.getByLabel("Día de visita 1 *").inputValue();
  await page.getByLabel("Día de visita 2 *").fill(firstVisitDay);
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await expect(page.getByText("Los dos días de visita deben ser distintos.")).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-dias-visita.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("filtra la agenda por cliente y estado", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/calendario");
  await expect(page.getByText("Cargando información...")).toBeHidden({ timeout: 10_000 });

  const clientSelect = page.getByLabel("Cliente");
  await expect(clientSelect.locator("option").first()).toHaveText("Todos los clientes");
  expect(await clientSelect.locator("option").count()).toBeGreaterThan(1);
  const clientOption = clientSelect.locator("option").nth(1);
  const clientId = await clientOption.getAttribute("value");
  const clientName = await clientOption.textContent();
  expect(clientId).toBeTruthy();
  expect(clientName).toBeTruthy();

  const clientResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/visits" && url.searchParams.get("clientId") === clientId;
  });
  await clientSelect.selectOption(clientId!);
  expect((await clientResponse).ok()).toBe(true);
  await expect(page.getByText("Cargando información...")).toBeHidden();
  expect(await page.locator("article").count()).toBeGreaterThan(0);
  for (const article of await page.locator("article").all()) await expect(article).toContainText(clientName!);

  const statusResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/visits" && url.searchParams.get("clientId") === clientId && url.searchParams.get("status") === "PENDING";
  });
  await page.getByLabel("Estado del servicio").selectOption("PENDING");
  expect((await statusResponse).ok()).toBe(true);
  await expect(page.getByText("Cargando información...")).toBeHidden();
  for (const article of await page.locator("article").all()) await expect(article).toContainText(clientName!);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-filtro-cliente.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("presenta el cobro como monto mensual", async ({ page }) => {
  await page.goto("/pagos");
  await page.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByLabel("Monto mensual (USD) *")).toBeVisible();
  await expect(page.getByText("Incluye las dos visitas del mes.")).toBeVisible();
});
