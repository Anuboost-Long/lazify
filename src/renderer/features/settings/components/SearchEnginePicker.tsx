import { useBrowserSettings } from "@renderer/shared/hooks/use-browser-settings";
import { SEARCH_ENGINES } from "@renderer/shared/lib/search-engines";
import { SearchEngineCard } from "./SearchEngineCard";

export function SearchEnginePicker() {
  const { searchEngine, setSearchEngine } = useBrowserSettings();

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {SEARCH_ENGINES.map((engine) => (
        <SearchEngineCard
          key={engine.id}
          engine={engine}
          selected={engine.id === searchEngine}
          onSelect={() => setSearchEngine(engine.id)}
        />
      ))}
    </div>
  );
}
