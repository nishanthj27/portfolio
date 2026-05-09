import portfolio from "@/data/portfolio.json";
import { AiOSPortfolio } from "@/components/AiOSPortfolio";

export default function Home() {
  return <AiOSPortfolio data={portfolio} />;
}
