import { test, expect } from '@playwright/test'

import { createEvaluation } from './helpers'

// Comparison + Export flow: two evaluations → /comparison → visualisations,
// URL state, self-comparison guard, export links.
test('comparison flow: two evaluations produce charts and export links', async ({
  page,
}) => {
  const evalA = await createEvaluation(page)
  const evalB = await createEvaluation(page)
  expect(evalA).not.toBe(evalB)

  // Export buttons present on the results page.
  await page.goto(`/results/${evalA}`)
  await page.waitForSelector("h1:has-text('Розрахунок #')")
  await expect(
    page.locator(`a[download='evaluation-${evalA}.csv']`),
  ).toHaveAttribute('href', /format=csv/)
  await expect(
    page.locator(`a[download='evaluation-${evalA}.json']`),
  ).toHaveAttribute('href', /format=json/)

  // Comparison page — pick A and B.
  await page.goto('/comparison')
  await page.waitForSelector("h1:has-text('Порівняння розрахунків')")

  await page.locator('button#select-a').click()
  await page.locator(`div[role='option']:has-text('#${evalA}')`).first().click()
  await page.locator('button#select-b').click()
  await page.locator(`div[role='option']:has-text('#${evalB}')`).first().click()

  const compareBtn = page.locator("button:has-text('Порівняти')").first()
  await expect(compareBtn).toBeEnabled()
  await compareBtn.click()

  // Results render.
  await expect(page.locator('text=Spearman ρ')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('text=Порівняння рангів')).toBeVisible()
  await expect(page.locator('text=Локації, які змінили позицію')).toBeVisible()
  await expect(page).toHaveURL(/[?&]a=\d+/)
  await expect(page).toHaveURL(/[?&]b=\d+/)

  // Export links for both evaluations.
  await expect(
    page.locator(`a[download='evaluation-${evalA}.csv']`),
  ).toBeVisible()
  await expect(
    page.locator(`a[download='evaluation-${evalB}.csv']`),
  ).toBeVisible()

  // Self-comparison (a == b) disables the compare button.
  await page.locator('button#select-b').click()
  await page.locator(`div[role='option']:has-text('#${evalA}')`).first().click()
  await expect(compareBtn).toBeDisabled()

  // URL state survives a reload.
  await page.goto(`/comparison?a=${evalA}&b=${evalB}`)
  await expect(page.locator('text=Spearman ρ')).toBeVisible({ timeout: 15_000 })
})
