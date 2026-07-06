import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleOverlapPolicy } from '@temporalio/client';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockGetHandle = vi.fn();

vi.mock('../services/smartMeterTexas/types', () => ({
  getSmtConfig: vi.fn(),
}));

vi.mock('@temporalio/client', async () => {
  const actual = await vi.importActual<typeof import('@temporalio/client')>('@temporalio/client');
  return {
    ...actual,
    Connection: {
      connect: vi.fn().mockResolvedValue({}),
    },
    Client: vi.fn().mockImplementation(() => ({
      schedule: {
        create: mockCreate,
        getHandle: mockGetHandle,
      },
    })),
  };
});

import { getSmtConfig } from '../services/smartMeterTexas/types';
import { ensureSmtSyncSchedule } from './schedules';
import {
  SMT_SYNC_SCHEDULED_WORKFLOW_ID,
  SMT_SYNC_SCHEDULE_ID,
  SMT_SYNC_WORKFLOW,
  TEMPORAL_TASK_QUEUE,
} from './config';

describe('ensureSmtSyncSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHandle.mockReturnValue({ update: mockUpdate });
  });

  it('does nothing when SMT is not configured', async () => {
    vi.mocked(getSmtConfig).mockReturnValue(null);

    await ensureSmtSyncSchedule({
      schedule: {
        create: mockCreate,
        getHandle: mockGetHandle,
      },
    } as never);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates schedule when it does not exist', async () => {
    vi.mocked(getSmtConfig).mockReturnValue({
      username: 'user',
      password: 'pass',
      syncIntervalMinutes: 30,
    });

    await ensureSmtSyncSchedule({
      schedule: {
        create: mockCreate,
        getHandle: mockGetHandle,
      },
    } as never);

    expect(mockCreate).toHaveBeenCalledWith({
      scheduleId: SMT_SYNC_SCHEDULE_ID,
      spec: {
        intervals: [{ every: '30 minutes' }],
      },
      action: {
        type: 'startWorkflow',
        workflowType: SMT_SYNC_WORKFLOW,
        taskQueue: TEMPORAL_TASK_QUEUE,
        args: [{}],
        workflowId: SMT_SYNC_SCHEDULED_WORKFLOW_ID,
      },
      policies: {
        overlap: ScheduleOverlapPolicy.SKIP,
        catchupWindow: '1 day' as const,
      },
    });
  });

  it('updates schedule when it already exists', async () => {
    vi.mocked(getSmtConfig).mockReturnValue({
      username: 'user',
      password: 'pass',
      syncIntervalMinutes: 45,
    });
    mockCreate.mockRejectedValue(new Error('schedule already exists'));

    await ensureSmtSyncSchedule({
      schedule: {
        create: mockCreate,
        getHandle: mockGetHandle,
      },
    } as never);

    expect(mockGetHandle).toHaveBeenCalledWith(SMT_SYNC_SCHEDULE_ID);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
