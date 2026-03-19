export type SceneStatus = "planning" | "building" | "ready";

export interface SceneNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  highlighted?: boolean;
}

export interface SceneEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  highlighted?: boolean;
}

export interface AlgorithmSceneState {
  visited: string[];
  stack: string[];
  currentNode?: string | null;
  currentEdge?: string | null;
  activeLine?: number | null;
  narration?: string;
}

export interface AlgorithmSceneStep {
  id: string;
  label: string;
  state: AlgorithmSceneState;
}

export interface AlgorithmSceneModel {
  sceneId: string;
  sceneKind: "dfs";
  title: string;
  description?: string;
  status: SceneStatus;
  graph?: {
    layout: "tree";
    nodes: SceneNode[];
    edges: SceneEdge[];
  };
  code?: string[];
  initialState?: AlgorithmSceneState;
  steps: AlgorithmSceneStep[];
  createdAt: number;
  source?: "illustrative" | "provided";
}

export type AlgorithmSceneEvent =
  | {
      type: "algorithm-scene-start";
      sceneId: string;
      sceneKind: "dfs";
      title: string;
      description?: string;
    }
  | {
      type: "algorithm-scene-structure";
      sceneId: string;
      scene: Omit<AlgorithmSceneModel, "status" | "steps" | "createdAt">;
    }
  | {
      type: "algorithm-scene-steps-append";
      sceneId: string;
      steps: AlgorithmSceneStep[];
    }
  | {
      type: "algorithm-scene-status";
      sceneId: string;
      status: SceneStatus;
    }
  | {
      type: "algorithm-scene-done";
      sceneId: string;
    };

export function isAlgorithmSceneEvent(
  value: unknown,
): value is AlgorithmSceneEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type?: unknown }).type === "string" &&
    (value as { type: string }).type.startsWith("algorithm-scene-")
  );
}

export function applyAlgorithmSceneEvent(
  scenes: Record<string, AlgorithmSceneModel>,
  event: AlgorithmSceneEvent,
): Record<string, AlgorithmSceneModel> {
  const current = scenes[event.sceneId];

  switch (event.type) {
    case "algorithm-scene-start":
      return {
        ...scenes,
        [event.sceneId]: {
          sceneId: event.sceneId,
          sceneKind: event.sceneKind,
          title: event.title,
          description: event.description,
          status: "planning",
          steps: [],
          createdAt: Date.now(),
        },
      };

    case "algorithm-scene-structure":
      if (!current) return scenes;
      return {
        ...scenes,
        [event.sceneId]: {
          ...current,
          ...event.scene,
        },
      };

    case "algorithm-scene-steps-append":
      if (!current) return scenes;
      return {
        ...scenes,
        [event.sceneId]: {
          ...current,
          steps: [...current.steps, ...event.steps],
        },
      };

    case "algorithm-scene-status":
      if (!current) return scenes;
      return {
        ...scenes,
        [event.sceneId]: {
          ...current,
          status: event.status,
        },
      };

    case "algorithm-scene-done":
      if (!current) return scenes;
      return {
        ...scenes,
        [event.sceneId]: {
          ...current,
          status: "ready",
        },
      };

    default:
      return scenes;
  }
}
