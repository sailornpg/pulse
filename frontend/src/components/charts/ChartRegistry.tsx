import { getChartKind, type ChartModel } from "@/types/chart";
import { D3BarChart } from "./D3BarChart";
import { D3GraphChart } from "./D3GraphChart";
import { D3LineChart } from "./D3LineChart";
import { D3ScatterChart } from "./D3ScatterChart";

interface ChartRegistryProps {
  model: ChartModel;
}

export function ChartRegistry({ model }: ChartRegistryProps) {
  const kind = getChartKind(model.dsl);

  switch (kind) {
    case "bar":
      return <D3BarChart model={model} />;
    case "scatter":
      return <D3ScatterChart model={model} />;
    case "graph":
      return <D3GraphChart model={model} />;
    case "line":
    default:
      return <D3LineChart model={model} />;
  }
}
