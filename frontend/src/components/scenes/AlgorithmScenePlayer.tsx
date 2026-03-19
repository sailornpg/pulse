import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import type {
  AlgorithmSceneModel,
  AlgorithmSceneState,
  SceneEdge,
  SceneNode,
} from "@/types/scene";

interface AlgorithmScenePlayerProps {
  model: AlgorithmSceneModel;
  compact?: boolean;
}

const PLAYBACK_SPEEDS = [0.75, 1, 1.5, 2] as const;
const SVG_WIDTH = 760;
const SVG_HEIGHT = 360;

function getSceneState(
  model: AlgorithmSceneModel,
  stepIndex: number,
): AlgorithmSceneState | undefined {
  if (stepIndex >= 0 && model.steps[stepIndex]) {
    return model.steps[stepIndex].state;
  }
  return model.initialState;
}

export function AlgorithmScenePlayer({
  model,
  compact = false,
}: AlgorithmScenePlayerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    model.steps.length > 0 ? 0 : -1,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof PLAYBACK_SPEEDS)[number]>(1);

  useEffect(() => {
    setCurrentStepIndex(model.steps.length > 0 ? 0 : -1);
    setIsPlaying(false);
  }, [model.sceneId]);

  useEffect(() => {
    if (model.steps.length === 0) {
      setCurrentStepIndex(-1);
      setIsPlaying(false);
      return;
    }

    setCurrentStepIndex((current) => {
      if (current < 0) return 0;
      return Math.min(current, model.steps.length - 1);
    });
  }, [model.steps.length]);

  useEffect(() => {
    if (!isPlaying || model.steps.length <= 1) return;
    if (currentStepIndex >= model.steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentStepIndex((current) => {
        if (current >= model.steps.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, Math.max(450, 1200 / speed));

    return () => window.clearTimeout(timer);
  }, [currentStepIndex, isPlaying, model.steps.length, speed]);

  const currentState = getSceneState(model, currentStepIndex);
  const nodeMap = useMemo(
    () =>
      new Map(
        (model.graph?.nodes ?? []).map((node) => [node.id, node] as const),
      ),
    [model.graph?.nodes],
  );

  const visitedSet = useMemo(
    () => new Set(currentState?.visited ?? []),
    [currentState?.visited],
  );
  const stackSet = useMemo(
    () => new Set(currentState?.stack ?? []),
    [currentState?.stack],
  );

  const hasGraph = Boolean(model.graph?.nodes?.length);
  const maxStepIndex = Math.max(model.steps.length - 1, 0);

  const jumpToNode = (nodeId: string) => {
    const targetIndex = model.steps.findIndex(
      (step) => step.state.currentNode === nodeId,
    );
    if (targetIndex >= 0) {
      setCurrentStepIndex(targetIndex);
      setIsPlaying(false);
    }
  };

  return (
    <section className="space-y-4">
      <div
        className={`grid gap-4 ${compact ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]" : "lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]"}`}
      >
        <div className="rounded-[22px] border border-white/10 bg-zinc-950/70 p-3">
          {hasGraph ? (
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="h-auto w-full rounded-[18px] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_48%),linear-gradient(180deg,rgba(10,10,12,0.96),rgba(18,18,22,0.88))]"
              role="img"
              aria-label={model.title}
            >
              {(model.graph?.edges ?? []).map((edge) => (
                <SceneEdgePath
                  key={edge.id}
                  edge={edge}
                  nodeMap={nodeMap}
                  isActive={currentState?.currentEdge === edge.id}
                />
              ))}

              {(model.graph?.nodes ?? []).map((node) => (
                <SceneNodeGlyph
                  key={node.id}
                  node={node}
                  isVisited={visitedSet.has(node.id)}
                  isCurrent={currentState?.currentNode === node.id}
                  isQueued={stackSet.has(node.id)}
                  onClick={() => jumpToNode(node.id)}
                />
              ))}
            </svg>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center rounded-[18px] border border-dashed border-border text-sm text-muted-foreground">
              Waiting for scene structure...
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] border border-border bg-background/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-400/80">
                  Scene Script
                </p>
                <h4 className="mt-1 text-sm font-semibold text-foreground">
                  {model.title}
                </h4>
              </div>
              <div className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
                Step{" "}
                <span className="font-medium text-foreground">
                  {model.steps.length === 0 ? 0 : currentStepIndex + 1}
                </span>
                /{model.steps.length}
              </div>
            </div>

            {model.code?.length ? (
              <div className="space-y-1 rounded-2xl border border-white/10 bg-zinc-950/80 p-3 font-mono text-xs">
                {model.code.map((line, index) => {
                  const isActive = currentState?.activeLine === index;
                  return (
                    <div
                      key={`${model.sceneId}-line-${index}`}
                      className={`flex gap-3 rounded-lg px-2 py-1.5 transition-colors ${
                        isActive
                          ? "bg-emerald-500/12 text-emerald-100"
                          : "text-zinc-400"
                      }`}
                    >
                      <span className="w-4 shrink-0 text-right text-zinc-500">
                        {index + 1}
                      </span>
                      <span className="whitespace-pre-wrap">{line}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
                Waiting for algorithm steps...
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <SceneStatePanel
              title="Narration"
              value={
                currentState?.narration ??
                model.description ??
                "Scene data is streaming in."
              }
            />
            <SceneStatePanel
              title="Visited"
              value={(currentState?.visited ?? []).join(" -> ") || "None"}
            />
            <SceneStatePanel
              title="Stack"
              value={(currentState?.stack ?? []).join(" -> ") || "Empty"}
            />
            <SceneStatePanel
              title="Current"
              value={currentState?.currentNode ?? "None"}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-border bg-background/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCurrentStepIndex(0);
              setIsPlaying(false);
            }}
            disabled={model.steps.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-2 text-sm text-foreground transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentStepIndex((current) => Math.max(current - 1, 0));
              setIsPlaying(false);
            }}
            disabled={currentStepIndex <= 0 || model.steps.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-2 text-sm text-foreground transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <button
            type="button"
            onClick={() => {
              if (currentStepIndex >= maxStepIndex) {
                setCurrentStepIndex(0);
              }
              setIsPlaying((current) => !current);
            }}
            disabled={model.steps.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentStepIndex((current) =>
                Math.min(current + 1, maxStepIndex),
              );
              setIsPlaying(false);
            }}
            disabled={
              model.steps.length === 0 || currentStepIndex >= maxStepIndex
            }
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-2 text-sm text-foreground transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight size={14} />
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>Speed</span>
            <select
              value={speed}
              onChange={(event) =>
                setSpeed(Number(event.target.value) as (typeof PLAYBACK_SPEEDS)[number])
              }
              className="rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
            >
              {PLAYBACK_SPEEDS.map((value) => (
                <option key={value} value={value}>
                  {value}x
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="range"
            min={0}
            max={maxStepIndex}
            value={Math.max(currentStepIndex, 0)}
            disabled={model.steps.length === 0}
            onChange={(event) => {
              setCurrentStepIndex(Number(event.target.value));
              setIsPlaying(false);
            }}
            className="w-full accent-emerald-500"
          />
        </div>

        {model.steps.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {model.steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setCurrentStepIndex(index);
                  setIsPlaying(false);
                }}
                className={`rounded-2xl border px-3 py-2 text-left transition ${
                  index === currentStepIndex
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                    : "border-border bg-muted/20 text-foreground hover:border-emerald-500/25"
                }`}
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Step {index + 1}
                </div>
                <div className="mt-1 text-sm font-medium">{step.label}</div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SceneEdgePath({
  edge,
  nodeMap,
  isActive,
}: {
  edge: SceneEdge;
  nodeMap: Map<string, SceneNode>;
  isActive: boolean;
}) {
  const source = nodeMap.get(edge.source);
  const target = nodeMap.get(edge.target);
  if (
    !source ||
    !target ||
    typeof source.x !== "number" ||
    typeof source.y !== "number" ||
    typeof target.x !== "number" ||
    typeof target.y !== "number"
  ) {
    return null;
  }

  return (
    <g>
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke={isActive ? "rgba(52,211,153,0.98)" : "rgba(148,163,184,0.42)"}
        strokeWidth={isActive ? 5 : 3}
        strokeOpacity={isActive ? 1 : 0.55}
        className="transition-all duration-300"
      />
      {edge.label ? (
        <text
          x={(source.x + target.x) / 2}
          y={(source.y + target.y) / 2 - 8}
          textAnchor="middle"
          className="fill-zinc-400 text-[11px]"
        >
          {edge.label}
        </text>
      ) : null}
    </g>
  );
}

function SceneNodeGlyph({
  node,
  isVisited,
  isCurrent,
  isQueued,
  onClick,
}: {
  node: SceneNode;
  isVisited: boolean;
  isCurrent: boolean;
  isQueued: boolean;
  onClick: () => void;
}) {
  const x = typeof node.x === "number" ? node.x : 0;
  const y = typeof node.y === "number" ? node.y : 0;
  const fill = isCurrent
    ? "rgba(16,185,129,0.95)"
    : isVisited
      ? "rgba(20,184,166,0.85)"
      : "rgba(39,39,42,0.92)";

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer"
      onClick={onClick}
    >
      {isQueued ? (
        <circle
          r={34}
          fill="none"
          stroke="rgba(74,222,128,0.55)"
          strokeWidth={2}
          strokeDasharray="6 6"
        />
      ) : null}
      <circle
        r={28}
        fill={fill}
        stroke={isCurrent ? "rgba(167,243,208,1)" : "rgba(255,255,255,0.08)"}
        strokeWidth={isCurrent ? 4 : 2}
        className="transition-all duration-300"
      />
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white text-base font-semibold"
      >
        {node.label}
      </text>
    </g>
  );
}

function SceneStatePanel({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-border bg-muted/20 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-foreground">{value}</div>
    </div>
  );
}
