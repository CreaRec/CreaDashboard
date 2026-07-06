import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      '../frontend/src/components/utilities/integrationStatus.test.ts',
      '../frontend/src/components/calendar/calendarUtils.test.ts',
    ],
  },
});
