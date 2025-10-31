import type { InferModel } from 'drizzle-orm'
import { db } from './index'
import { webhooks } from './schema/webhooks'

type SeedWebhook = {
  method: string
  pathname: string
  ip: string
  statusCode?: number
  contentType?: string | null
  contentLength?: number | null
  queryParams?: Record<string, string> | null
  headers: Record<string, string>
  body?: string | null
  createdAt?: Date
}

function makeSeed(count = 60) {
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  const userAgents = [
    'curl/7.68.0',
    'Mozilla/5.0 (compatible; webhook-inspector/1.0)',
    'PostmanRuntime/7.29.0',
    'axios/1.5.0',
  ]

  const seed: SeedWebhook[] = Array.from({ length: count }).map((_, i) => {
    const method = methods[i % methods.length]
    const pathname = `/api/hooks/${(i % 12) + 1}`
    const ip = `192.0.2.${(i % 250) + 1}`
    const statusCodes = [200, 201, 204, 400, 404, 422, 500]
    const statusCode = statusCodes[i % statusCodes.length]
    const contentType =
      method === 'GET' ? null : i % 3 === 0 ? 'application/json' : 'text/plain'
    const contentLength = contentType ? 20 + (i % 100) : null
    const queryParams =
      i % 4 === 0
        ? { page: String(Math.floor(i / 10) + 1), q: `search-${i}` }
        : null
    const headers: Record<string, string> = {
      'user-agent': userAgents[i % userAgents.length],
      accept: '*/*',
    }
    if (contentType) headers['content-type'] = contentType

    const body =
      contentType === 'application/json'
        ? JSON.stringify({ i, ok: i % 2 === 0 }, null, 2)
        : contentType === 'text/plain'
          ? `plain body #${i}`
          : null

    const createdAt = new Date(Date.now() - i * 1000 * 60)

    return {
      method,
      pathname,
      ip,
      statusCode,
      contentType,
      contentLength,
      queryParams,
      headers,
      body,
      createdAt,
    }
  })

  return seed
}

export async function main() {
  const seedData = makeSeed(60)

  console.log(`Inserting ${seedData.length} webhooks...`)

  try {
    // Insert one-by-one to avoid typing issues with spread overloads
    for (const row of seedData) {
      // use Drizzle's inferred insert type so we avoid `any` in the seed
      await db
        .insert(webhooks)
        .values(row as InferModel<typeof webhooks, 'insert'>)
    }

    console.log('Seed finished: inserted', seedData.length)
  } catch (err) {
    console.error('Failed to run seed:', err)
    throw err
  }
}

// Run when executed directly (tsx src/db/seed.ts)
// tsconfig in this repo uses module: es2015 which doesn't allow import.meta in TS check,
// so do a simple argv check for the seed path used by the npm script.
if (
  process.argv[1] &&
  (process.argv[1].endsWith('/src/db/seed.ts') ||
    process.argv[1].endsWith('\\src\\db\\seed.ts'))
) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
