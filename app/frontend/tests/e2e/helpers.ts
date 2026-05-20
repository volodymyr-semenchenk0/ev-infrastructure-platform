import { expect, type Page } from '@playwright/test'

// Run the profile → calculate flow and return the new evaluation id parsed
// from the /results/{id} URL.
export async function createEvaluation(page: Page): Promise<number> {
  await page.goto('/profile')
  await page.waitForLoadState('networkidle')
  await page.locator("button:has-text('Обрати')").first().click()
  await page.locator("a:has-text('Перейти до розрахунку')").first().click()
  await page.waitForURL('**/calculate')
  await page.waitForLoadState('networkidle')
  await page.locator("button:has-text('Обчислити')").first().click()
  await page.waitForURL('**/results/**', { timeout: 15_000 })
  await page.waitForSelector("h1:has-text('Розрахунок #')")

  const url = page.url()
  const id = Number.parseInt(url.replace(/\/$/, '').split('/').pop() ?? '', 10)
  expect(Number.isFinite(id) && id > 0).toBe(true)
  return id
}
