import { test, expect, type ConsoleMessage } from '@playwright/test'

import { createEvaluation } from './helpers'

// Full happy path: home → profile → calculate → results → map → sensitivity.
// Mirrors the manual smoke flow that validated Etap 6.2–6.5.
test('calculate flow: profile to sensitivity with no console errors', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    // OSM raster tiles are fetched from an external server; in a sandboxed
    // test environment that fetch can fail. That is an environment issue,
    // not an application bug, so it is excluded from the assertion.
    if (/maplibre|Failed to fetch/i.test(text)) return
    consoleErrors.push(text)
  })

  // Home
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('text=СППР EV Київ').first()).toBeVisible()

  // Profile → Calculate → Results
  const evaluationId = await createEvaluation(page)
  await expect(page.locator("h1:has-text('Розрахунок #')")).toBeVisible()
  await expect(page.locator('text=Ваги критеріїв')).toBeVisible()
  await expect(page.locator('text=Ранжування локацій')).toBeVisible()

  // Map — lazy-loaded chunk
  await page.locator("a:has-text('Показати на карті')").first().click()
  await page.waitForURL('**/map**')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('canvas').first()).toBeVisible()

  // Sensitivity — lazy-loaded chunk
  await page.goto(`/sensitivity/${evaluationId}`)
  await page.waitForSelector('input#iterations')
  await page.locator('input#iterations').fill('200')
  await page.locator("button:has-text('Запустити')").first().click()
  await page.waitForSelector('text=Матриця стабільності рангів', {
    timeout: 30_000,
  })
  await expect(page.locator('text=95% довірчі інтервали')).toBeVisible()

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual(
    [],
  )
})
