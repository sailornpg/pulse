import type { AlgorithmSceneModel } from "@/types/scene";
import { AlgorithmScenePlayer } from "../scenes/AlgorithmScenePlayer";

interface AlgorithmSceneResultProps {
  result: AlgorithmSceneModel & {
    rationale?: string;
  };
}

export function AlgorithmSceneResult({
  result,
}: AlgorithmSceneResultProps) {
  const model: AlgorithmSceneModel = {
    sceneId: result.sceneId,
    sceneKind: result.sceneKind,
    title: result.title,
    description: result.description,
    status: "ready",
    graph: result.graph,
    code: result.code,
    initialState: result.initialState,
    steps: result.steps ?? [],
    createdAt: Date.now(),
    source: result.source,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full border border-border bg-background/60 px-2.5 py-1">
          {result.source === "illustrative" ? "Illustrative scene" : "Data-driven scene"}
        </span>
        <span className="rounded-full border border-border bg-background/60 px-2.5 py-1">
          {result.sceneKind.toUpperCase()}
        </span>
        <span className="rounded-full border border-border bg-background/60 px-2.5 py-1">
          Steps: {result.steps?.length ?? 0}
        </span>
      </div>

      {result.rationale ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {result.rationale}
        </p>
      ) : null}

      <AlgorithmScenePlayer model={model} />
    </div>
  );
}
