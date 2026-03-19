export interface SceneNode {
  [key: string]: string | boolean | number | undefined;
  id: string;
  label: string;
  x?: number;
  y?: number;
  highlighted?: boolean;
}

export interface SceneEdge {
  [key: string]: string | boolean | undefined;
  id: string;
  source: string;
  target: string;
  label?: string;
  highlighted?: boolean;
}

export interface AlgorithmSceneState {
  [key: string]:
    | string
    | number
    | string[]
    | null
    | undefined;
  visited: string[];
  stack: string[];
  currentNode?: string | null;
  currentEdge?: string | null;
  activeLine?: number | null;
  narration?: string;
}

export interface AlgorithmSceneStep {
  [key: string]: string | AlgorithmSceneState;
  id: string;
  label: string;
  state: AlgorithmSceneState;
}

export interface SceneGraph {
  [key: string]: string | SceneNode[] | SceneEdge[];
  layout: "tree";
  nodes: SceneNode[];
  edges: SceneEdge[];
}

export interface AlgorithmScene {
  [key: string]:
    | string
    | string[]
    | SceneGraph
    | AlgorithmSceneState
    | AlgorithmSceneStep[]
    | undefined;
  sceneId: string;
  sceneKind: "dfs";
  title: string;
  description?: string;
  graph: SceneGraph;
  code: string[];
  initialState: AlgorithmSceneState;
  steps: AlgorithmSceneStep[];
  source: "illustrative" | "provided";
}

export type AlgorithmSceneStreamEvent =
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
      scene: Omit<AlgorithmScene, "steps">;
    }
  | {
      type: "algorithm-scene-steps-append";
      sceneId: string;
      steps: AlgorithmSceneStep[];
    }
  | {
      type: "algorithm-scene-status";
      sceneId: string;
      status: "planning" | "building" | "ready";
    }
  | {
      type: "algorithm-scene-done";
      sceneId: string;
    };

export type AlgorithmSceneEventWriter = (
  event: AlgorithmSceneStreamEvent,
) => void | Promise<void>;

export async function emitAlgorithmSceneStream(
  writeEvent: AlgorithmSceneEventWriter | undefined,
  scene: AlgorithmScene,
  options?: {
    batchSize?: number;
    delayMs?: number;
  },
) {
  if (!writeEvent) return;

  const batchSize = options?.batchSize ?? 2;
  const delayMs = options?.delayMs ?? 180;

  await writeEvent({
    type: "algorithm-scene-start",
    sceneId: scene.sceneId,
    sceneKind: scene.sceneKind,
    title: scene.title,
    description: scene.description,
  });

  await sleep(80);
  await writeEvent({
    type: "algorithm-scene-status",
    sceneId: scene.sceneId,
    status: "building",
  });

  await sleep(80);
  await writeEvent({
    type: "algorithm-scene-structure",
    sceneId: scene.sceneId,
    scene: {
      sceneId: scene.sceneId,
      sceneKind: scene.sceneKind,
      title: scene.title,
      description: scene.description,
      graph: scene.graph,
      code: scene.code,
      initialState: scene.initialState,
      source: scene.source,
    },
  });

  for (let index = 0; index < scene.steps.length; index += batchSize) {
    await writeEvent({
      type: "algorithm-scene-steps-append",
      sceneId: scene.sceneId,
      steps: scene.steps.slice(index, index + batchSize),
    });
    await sleep(delayMs);
  }

  await writeEvent({
    type: "algorithm-scene-status",
    sceneId: scene.sceneId,
    status: "ready",
  });

  await writeEvent({
    type: "algorithm-scene-done",
    sceneId: scene.sceneId,
  });
}

export function buildIllustrativeDfsScene(
  title: string,
  description?: string,
): AlgorithmScene {
  const sceneId = `scene_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const nodes: SceneNode[] = [
    { id: "A", label: "A", x: 380, y: 56 },
    { id: "B", label: "B", x: 240, y: 148 },
    { id: "C", label: "C", x: 520, y: 148 },
    { id: "D", label: "D", x: 180, y: 252 },
    { id: "E", label: "E", x: 300, y: 252 },
    { id: "F", label: "F", x: 520, y: 252 },
  ];
  const edges: SceneEdge[] = [
    { id: "A-B", source: "A", target: "B" },
    { id: "A-C", source: "A", target: "C" },
    { id: "B-D", source: "B", target: "D" },
    { id: "B-E", source: "B", target: "E" },
    { id: "C-F", source: "C", target: "F" },
  ];

  const code = [
    "dfs(node):",
    "  mark node as visited",
    "  for neighbor in neighbors(node):",
    "    if neighbor not visited:",
    "      push neighbor to stack",
    "      dfs(neighbor)",
  ];

  const initialState: AlgorithmSceneState = {
    visited: [],
    stack: ["A"],
    currentNode: null,
    currentEdge: null,
    activeLine: 0,
    narration: "准备从起点 A 开始 DFS。",
  };

  const steps: AlgorithmSceneStep[] = [
    {
      id: "step-1",
      label: "访问 A",
      state: {
        visited: ["A"],
        stack: ["A"],
        currentNode: "A",
        currentEdge: null,
        activeLine: 1,
        narration: "访问起点 A，并标记为已访问。",
      },
    },
    {
      id: "step-2",
      label: "走向 B",
      state: {
        visited: ["A", "B"],
        stack: ["A", "B"],
        currentNode: "B",
        currentEdge: "A-B",
        activeLine: 5,
        narration: "沿着边 A-B 深入到节点 B。",
      },
    },
    {
      id: "step-3",
      label: "走向 D",
      state: {
        visited: ["A", "B", "D"],
        stack: ["A", "B", "D"],
        currentNode: "D",
        currentEdge: "B-D",
        activeLine: 5,
        narration: "继续从 B 深入到 D。",
      },
    },
    {
      id: "step-4",
      label: "回溯到 B",
      state: {
        visited: ["A", "B", "D"],
        stack: ["A", "B"],
        currentNode: "B",
        currentEdge: "B-D",
        activeLine: 2,
        narration: "D 没有未访问邻居，回溯到 B。",
      },
    },
    {
      id: "step-5",
      label: "走向 E",
      state: {
        visited: ["A", "B", "D", "E"],
        stack: ["A", "B", "E"],
        currentNode: "E",
        currentEdge: "B-E",
        activeLine: 5,
        narration: "从 B 继续探索到 E。",
      },
    },
    {
      id: "step-6",
      label: "回到 A 再去 C",
      state: {
        visited: ["A", "B", "D", "E", "C"],
        stack: ["A", "C"],
        currentNode: "C",
        currentEdge: "A-C",
        activeLine: 5,
        narration: "回到 A 后，访问另一条分支 C。",
      },
    },
    {
      id: "step-7",
      label: "访问 F",
      state: {
        visited: ["A", "B", "D", "E", "C", "F"],
        stack: ["A", "C", "F"],
        currentNode: "F",
        currentEdge: "C-F",
        activeLine: 5,
        narration: "从 C 深入到 F，所有节点访问完成。",
      },
    },
  ];

  return {
    sceneId,
    sceneKind: "dfs",
    title,
    description,
    graph: {
      layout: "tree",
      nodes,
      edges,
    },
    code,
    initialState,
    steps,
    source: "illustrative",
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
