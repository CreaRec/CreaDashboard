export const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
export const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? 'default';
export const TEMPORAL_TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE ?? 'smt-sync';
export const SMT_SYNC_SCHEDULE_ID = 'smt-sync-schedule';
export const SMT_SYNC_WORKFLOW = 'smtSyncWorkflow';
export const SMT_SYNC_SCHEDULED_WORKFLOW_ID = 'smt-sync-scheduled';
