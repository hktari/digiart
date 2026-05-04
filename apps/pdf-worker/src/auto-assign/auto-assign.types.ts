export interface AutoAssignJobData {
  releaseId: string;
  creatorProfileId: string;
  cycleId: string;
}

export interface AutoAssignJobResult {
  assignedCount: number;
  skippedAtLimitCount: number;
}
