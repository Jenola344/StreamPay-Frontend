"use client";

import { useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { StreamRow, type StreamRowData } from "../components/StreamRow";
import { createRate, formatRate, type StreamInterval, type SupportedAsset } from "../lib/amount";
import { fetchWithIdempotency } from "@/lib/apiClient";

export type StreamsViewState = "empty" | "loading" | "populated";

const streamListCopy = {
  description:
    "Track recipients, rates, statuses, and the next action from one scan-friendly streams list. Calendar-month streams prorate by UTC when starting or pausing mid-month.",
  empty: {
    actionLabel: "Create Your First Stream",
    description: "No streams yet. Create one to start paying collaborators and vendors on a steady schedule.",
    eyebrow: "Streams",
    title: "Your streams list is empty",
  },
  heading: "Streams",
  loadingLabel: "Loading streams",
  populatedCount: "3 active records",
  primaryCta: "Create Stream",
} as const;

type StreamSeed = Omit<StreamRowData, "rate"> & {
  asset: SupportedAsset;
  interval: StreamInterval;
  rateAmount: string;
};

const streamSeeds: StreamSeed[] = [
  {
    asset: "XLM",
    id: "stream-ada",
    interval: "month",
    nextAction: "Pause",
    rateAmount: "120",
    recipient: "Ada Creative Studio",
    schedule: "Monthly retainer schedule",
    status: "active",
  },
  {
    asset: "XLM",
    id: "stream-kemi",
    interval: "week",
    nextAction: "Start",
    rateAmount: "32",
    recipient: "Kemi Onboarding Support",
    schedule: "Draft stream ready to launch",
    status: "draft",
  },
  {
    asset: "XLM",
    id: "stream-yusuf",
    interval: "day",
    nextAction: "Withdraw",
    rateAmount: "18",
    recipient: "Yusuf QA Partnership",
    schedule: "Ended yesterday with funds available",
    status: "ended",
  },
];

function renderRateOrFallback(rateAmount: string, asset: SupportedAsset, interval: StreamInterval): string {
  const rateResult = createRate(rateAmount, asset, interval);

  if (!rateResult.ok) {
    return "Invalid rate";
  }

  return formatRate(rateResult.value);
}

const mockStreams: StreamRowData[] = streamSeeds.map(({ asset, interval, rateAmount, ...stream }) => ({
  ...stream,
  rate: renderRateOrFallback(rateAmount, asset, interval),
}));

type StreamsPageContentProps = {
  state?: StreamsViewState;
  streams?: StreamRowData[];
};

function StreamListSkeleton() {
  return (
    <section aria-label={streamListCopy.loadingLabel} className="stream-list">
      {Array.from({ length: 3 }).map((_, index) => (
        <article
          aria-hidden="true"
          className="stream-row stream-row--skeleton"
          data-testid="stream-row-skeleton"
          key={`stream-skeleton-${index + 1}`}
        >
          <div className="stream-row__primary">
            <div className="stream-row__skeleton-block">
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--text" />
            </div>
            <div className="skeleton skeleton--badge" />
          </div>

          <div className="stream-row__meta stream-row__meta--skeleton">
            <div>
              <div className="skeleton skeleton--label" />
              <div className="skeleton skeleton--value" />
            </div>
            <div>
              <div className="skeleton skeleton--label" />
              <div className="skeleton skeleton--value" />
            </div>
          </div>

          <div className="skeleton skeleton--button" />
        </article>
      ))}
    </section>
  );
}

function StreamsPageContent({
  state = "populated",
  streams = mockStreams,
}: StreamsPageContentProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const isEmpty = state === "empty" || streams.length === 0;

  const handleCreateStream = async () => {
    setIsCreating(true);
    setErrorMsg(null);
    
    try {
      await fetchWithIdempotency("/api/streams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rate: "100 XLM / month",
          recipient: "New Collaborator",
        }),
      });
      
      alert("Stream created successfully!");
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="page-hero__eyebrow">{streamListCopy.heading}</p>
          <h1 className="page-hero__title">Manage every stream from one list.</h1>
          <p className="page-hero__description">{streamListCopy.description}</p>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button 
            className="button button--primary" 
            type="button"
            onClick={handleCreateStream}
            disabled={isCreating}
          >
            {isCreating ? "Processing..." : streamListCopy.primaryCta}
          </button>
          {errorMsg && (
            <p style={{ color: "red", fontSize: "0.875rem", maxWidth: "250px" }}>
              {errorMsg}
            </p>
          )}
        </div>
      </section>

      <section className="stream-layout" aria-labelledby="streams-overview-title">
        <div className="section-heading">
          <div>
            <h2 className="section-heading__title" id="streams-overview-title">
              Streams overview
            </h2>
            <p className="section-heading__description">
              Recipient, rate, status, and the primary next action stay visible at a glance.
            </p>
          </div>
          {state === "populated" && <p className="section-heading__meta">{streamListCopy.populatedCount}</p>}
        </div>

        {state === "loading" ? (
          <StreamListSkeleton />
        ) : isEmpty ? (
          <EmptyState
            actionLabel={streamListCopy.empty.actionLabel}
            description={streamListCopy.empty.description}
            eyebrow={streamListCopy.empty.eyebrow}
            title={streamListCopy.empty.title}
          />
        ) : (
          <section aria-label="Streams list" className="stream-list">
            {streams.map((stream) => (
              <StreamRow key={stream.id} stream={stream} />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}

export default function StreamsPage() {
  return <StreamsPageContent />;
}