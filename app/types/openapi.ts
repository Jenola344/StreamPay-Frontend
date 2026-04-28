export type StreamStatus = "draft" | "active" | "paused" | "ended" | "withdrawn";
export type StreamAction = "start" | "pause" | "stop" | "settle" | "withdraw";

export interface Stream {
  id: string;
  recipient: string;
  rate: string;
  schedule: string;
  status: StreamStatus;
  nextAction?: StreamAction;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  request_id: string;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface PaginatedMeta {
  hasNext: boolean;
  nextCursor: string | null;
  total: number;
}

export interface PaginationLinks {
  self: string;
  next?: string;
  prev?: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  streamId?: string;
  timestamp: string;
  description: string;
}
