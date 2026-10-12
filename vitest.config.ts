/**
 * Unit tests — run with `npm test`.
 * Plain Node environment: the date, holiday and booking-slot logic is pure
 * TypeScript. The computer's own time zone is deliberately set far from
 * New York, to prove the Eastern-Time helpers never depend on it.
 */
import { defineConfig } from 'vitest/config';

process.env.TZ = 'Asia/Kolkata';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
