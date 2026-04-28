export type StreamStatus = "draft" | "active" | "paused" | "ended";

export type StreamRecord = {
  availableBalance: bigint;
  escrowBalance: bigint;
  id: string;
  lastSettlementAt: number;
  status: StreamStatus;
  tenantId: string;
};

export type StreamCommandType = "pause" | "resume" | "settle_tick" | "stop";

export type StreamCommand = {
  actorTenantId: string;
  at?: number;
  idempotencyKey?: string;
  processingDelayMs?: number;
  settleAmount?: bigint;
  type: StreamCommandType;
};

export type StreamErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_COMMAND"
  | "ILLEGAL_TRANSITION"
  | "INSUFFICIENT_AVAILABLE"
  | "INSUFFICIENT_ESCROW";

export type StreamError = {
  code: StreamErrorCode;
  httpStatus: 400 | 403 | 404 | 409;
  message: string;
};

export type StreamResult =
  | { ok: true; stream: StreamRecord }
  | { error: StreamError; ok: false };

export type StreamMetrics = {
  pauseAttempts: number;
  pauseFailures: number;
  pauseSuccess: number;
  resumeAttempts: number;
  resumeFailures: number;
  resumeSuccess: number;
};

type PersistedResult = {
  commandType: StreamCommandType;
  result: StreamResult;
};

type LockState = {
  queue: Promise<void>;
  release: () => void;
};

function cloneStream(stream: StreamRecord): StreamRecord {
  return {
    ...stream,
    availableBalance: BigInt(stream.availableBalance),
    escrowBalance: BigInt(stream.escrowBalance),
  };
}

function streamError(httpStatus: StreamError["httpStatus"], code: StreamErrorCode, message: string): StreamResult {
  return {
    error: { code, httpStatus, message },
    ok: false,
  };
}

function createReleasePromise(): LockState {
  let release = () => {
    return;
  };

  const queue = new Promise<void>((resolve) => {
    release = resolve;
  });

  return { queue, release };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class InMemoryStreamStore {
  private readonly idempotentResults = new Map<string, PersistedResult>();
  private readonly locks = new Map<string, LockState>();
  private readonly streams = new Map<string, StreamRecord>();

  readonly metrics: StreamMetrics = {
    pauseAttempts: 0,
    pauseFailures: 0,
    pauseSuccess: 0,
    resumeAttempts: 0,
    resumeFailures: 0,
    resumeSuccess: 0,
  };

  constructor(initialStreams: StreamRecord[]) {
    for (const stream of initialStreams) {
      this.streams.set(stream.id, cloneStream(stream));
    }
  }

  getStream(streamId: string): StreamRecord | undefined {
    const existing = this.streams.get(streamId);
    if (!existing) {
      return undefined;
    }
    return cloneStream(existing);
  }

  // Lock ordering policy: always acquire stream lock first. Subordinate rows (escrow/events)
  // are represented as in-memory fields and can only be touched while this stream lock is held.
  private async withStreamLock<T>(streamId: string, fn: () => Promise<T>): Promise<T> {
    const current = this.locks.get(streamId);
    const next = createReleasePromise();
    this.locks.set(streamId, next);

    if (current) {
      await current.queue;
    }

    try {
      return await fn();
    } finally {
      next.release();
      if (this.locks.get(streamId) === next) {
        this.locks.delete(streamId);
      }
    }
  }

  private buildIdempotencyToken(streamId: string, command: StreamCommand): string {
    return `${streamId}:${command.actorTenantId}:${command.idempotencyKey}`;
  }

  private maybeGetIdempotentResult(streamId: string, command: StreamCommand): StreamResult | undefined {
    if (!command.idempotencyKey || (command.type !== "pause" && command.type !== "resume")) {
      return undefined;
    }

    const persisted = this.idempotentResults.get(this.buildIdempotencyToken(streamId, command));
    if (!persisted) {
      return undefined;
    }

    if (persisted.commandType !== command.type) {
      return streamError(409, "ILLEGAL_TRANSITION", "Idempotency key already used for a different command.");
    }

    return persisted.result;
  }

  private persistIdempotentResult(streamId: string, command: StreamCommand, result: StreamResult): void {
    if (!command.idempotencyKey || (command.type !== "pause" && command.type !== "resume")) {
      return;
    }

    this.idempotentResults.set(this.buildIdempotencyToken(streamId, command), {
      commandType: command.type,
      result,
    });
  }

  private validateActor(stream: StreamRecord, command: StreamCommand): StreamResult | undefined {
    if (stream.tenantId !== command.actorTenantId) {
      return streamError(403, "FORBIDDEN", "Actor cannot mutate another tenant's stream.");
    }
    return undefined;
  }

  private applyPause(stream: StreamRecord): StreamResult {
    if (stream.status === "paused") {
      return { ok: true, stream: cloneStream(stream) };
    }

    if (stream.status !== "active") {
      return streamError(409, "ILLEGAL_TRANSITION", `Pause is illegal from status ${stream.status}.`);
    }

    stream.status = "paused";
    return { ok: true, stream: cloneStream(stream) };
  }

  private applyResume(stream: StreamRecord): StreamResult {
    if (stream.status === "active") {
      return { ok: true, stream: cloneStream(stream) };
    }

    if (stream.status !== "paused") {
      return streamError(409, "ILLEGAL_TRANSITION", `Resume is illegal from status ${stream.status}.`);
    }

    stream.status = "active";
    return { ok: true, stream: cloneStream(stream) };
  }

  private applySettleTick(stream: StreamRecord, settleAmount: bigint, at: number): StreamResult {
    if (stream.status === "ended") {
      return streamError(409, "ILLEGAL_TRANSITION", "Cannot settle an ended stream.");
    }

    if (settleAmount < 0n) {
      return streamError(400, "INVALID_COMMAND", "settleAmount must be >= 0.");
    }

    if (stream.escrowBalance < settleAmount) {
      return streamError(409, "INSUFFICIENT_ESCROW", "Insufficient escrow for settlement tick.");
    }

    stream.escrowBalance -= settleAmount;
    stream.availableBalance += settleAmount;
    stream.lastSettlementAt = at;

    return { ok: true, stream: cloneStream(stream) };
  }

  private applyStop(stream: StreamRecord): StreamResult {
    if (stream.status === "ended") {
      return { ok: true, stream: cloneStream(stream) };
    }

    stream.status = "ended";
    return { ok: true, stream: cloneStream(stream) };
  }

  private trackMetricAttempt(type: StreamCommandType): void {
    if (type === "pause") {
      this.metrics.pauseAttempts += 1;
    }

    if (type === "resume") {
      this.metrics.resumeAttempts += 1;
    }
  }

  private trackMetricResult(type: StreamCommandType, result: StreamResult): void {
    if (type === "pause") {
      if (result.ok) {
        this.metrics.pauseSuccess += 1;
      } else {
        this.metrics.pauseFailures += 1;
      }
    }

    if (type === "resume") {
      if (result.ok) {
        this.metrics.resumeSuccess += 1;
      } else {
        this.metrics.resumeFailures += 1;
      }
    }
  }

  async applyEvent(streamId: string, command: StreamCommand): Promise<StreamResult> {
    this.trackMetricAttempt(command.type);

    return this.withStreamLock(streamId, async () => {
      const idempotent = this.maybeGetIdempotentResult(streamId, command);
      if (idempotent) {
        this.trackMetricResult(command.type, idempotent);
        return idempotent;
      }

      const stream = this.streams.get(streamId);
      if (!stream) {
        const notFound = streamError(404, "NOT_FOUND", `Stream ${streamId} was not found.`);
        this.trackMetricResult(command.type, notFound);
        this.persistIdempotentResult(streamId, command, notFound);
        return notFound;
      }

      const authError = this.validateActor(stream, command);
      if (authError) {
        this.trackMetricResult(command.type, authError);
        this.persistIdempotentResult(streamId, command, authError);
        return authError;
      }

      if (command.processingDelayMs && command.processingDelayMs > 0) {
        await sleep(command.processingDelayMs);
      }

      let result: StreamResult;

      switch (command.type) {
        case "pause":
          result = this.applyPause(stream);
          break;
        case "resume":
          result = this.applyResume(stream);
          break;
        case "settle_tick":
          result = this.applySettleTick(stream, command.settleAmount ?? 0n, command.at ?? Date.now());
          break;
        case "stop":
          result = this.applyStop(stream);
          break;
        default:
          result = streamError(400, "INVALID_COMMAND", "Unsupported command.");
          break;
      }

      this.trackMetricResult(command.type, result);
      this.persistIdempotentResult(streamId, command, result);
      return result;
    });
  }
}

export type PauseResumeRouteRequest = {
  actorTenantId: string;
  headers: Record<string, string | undefined>;
  streamId: string;
};

export async function pauseRoute(store: InMemoryStreamStore, request: PauseResumeRouteRequest): Promise<StreamResult> {
  const idempotencyKey = request.headers["idempotency-key"];

  if (!idempotencyKey) {
    return streamError(400, "INVALID_COMMAND", "Idempotency-Key header is required.");
  }

  return store.applyEvent(request.streamId, {
    actorTenantId: request.actorTenantId,
    idempotencyKey,
    type: "pause",
  });
}

export async function resumeRoute(store: InMemoryStreamStore, request: PauseResumeRouteRequest): Promise<StreamResult> {
  const idempotencyKey = request.headers["idempotency-key"];

  if (!idempotencyKey) {
    return streamError(400, "INVALID_COMMAND", "Idempotency-Key header is required.");
  }

  return store.applyEvent(request.streamId, {
    actorTenantId: request.actorTenantId,
    idempotencyKey,
    type: "resume",
  });
}
