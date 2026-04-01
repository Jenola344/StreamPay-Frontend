import { StatusBadge, type StreamStatus } from "./StatusBadge";

export type StreamRowData = {
  id: string;
  nextAction: string;
  rate: string;
  recipient: string;
  schedule: string;
  status: StreamStatus;
};

type StreamRowProps = {
  stream: StreamRowData;
};

export function StreamRow({ stream }: StreamRowProps) {
  return (
    <article className="stream-row" aria-labelledby={`${stream.id}-recipient`}>
      <div className="stream-row__primary">
        <div>
          <h2 className="stream-row__recipient" id={`${stream.id}-recipient`}>
            {stream.recipient}
          </h2>
          <p className="stream-row__schedule">{stream.schedule}</p>
        </div>
        <StatusBadge status={stream.status} />
      </div>

      <dl className="stream-row__meta">
        <div>
          <dt>Rate</dt>
          <dd>{stream.rate}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{stream.status}</dd>
        </div>
      </dl>

      <button className="button button--secondary stream-row__action" type="button">
        {stream.nextAction}
      </button>
    </article>
  );
}
