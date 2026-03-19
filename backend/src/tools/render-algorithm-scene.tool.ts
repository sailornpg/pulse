import { tool } from "ai";
import { z } from "zod";
import {
  buildIllustrativeDfsScene,
  emitAlgorithmSceneStream,
  type AlgorithmScene,
  type AlgorithmSceneEventWriter,
} from "../chat/algorithm-scene-stream";

export function createRenderAlgorithmSceneTool(
  onSceneEvent?: AlgorithmSceneEventWriter,
) {
  return tool({
    description:
      "Render an interactive algorithm scene for the user. Use this for DFS, BFS, traversal demos, step-by-step algorithm animations, and scenarios that need playback controls, code highlighting, and evolving state.",
    parameters: z.object({
      sceneKind: z.enum(["dfs"]).describe("The algorithm scene to build."),
      title: z.string().describe("A concise scene title."),
      description: z
        .string()
        .optional()
        .describe("Short explanation of what the scene demonstrates."),
      narrationGoal: z
        .string()
        .describe("What the animation should help the user understand."),
    }),
    execute: async ({ sceneKind, title, description, narrationGoal }) => {
      let scene: AlgorithmScene;

      switch (sceneKind) {
        case "dfs":
        default:
          scene = buildIllustrativeDfsScene(
            title,
            description ?? narrationGoal,
          );
          break;
      }

      await emitAlgorithmSceneStream(onSceneEvent, scene);

      return {
        ...scene,
        rationale: narrationGoal,
      };
    },
  });
}
