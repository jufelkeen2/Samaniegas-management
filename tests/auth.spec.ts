import { expect, test } from "@playwright/test";

const username = process.env.E2E_AUTH_USERNAME;
const password = process.env.E2E_AUTH_PASSWORD;

test("bloquea páginas y APIs sin sesión", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/clientes");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Samaniegas Management" })).toBeVisible();
  expect((await request.get("/api/clients")).status()).toBe(401);
  expect(errors).toEqual([]);
});

test("muestra un error con credenciales inválidas", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill("usuario.incorrecto");
  await page.getByLabel("Contraseña", { exact: true }).fill("ClaveIncorrecta-123!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("Usuario o contraseña incorrectos.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("inicia y cierra sesión correctamente", async ({ page }, testInfo) => {
  if (!username || !password) throw new Error("Faltan credenciales E2E en el entorno");
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(username);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('img[alt="Logo de Samaniegas Management"]:visible')).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-sesion.png`, fullPage: true });
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  expect(errors).toEqual([]);
});
