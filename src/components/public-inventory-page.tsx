"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Carrot,
  MoonStar,
  PackageSearch,
  RefreshCw,
  Sprout,
  Star,
  Tag,
  UtensilsCrossed,
  Vegan,
  WheatOff,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useLanguage } from "@/contexts/language-context";
import { isRTL } from "@/lib/rtl-utils";
import {
  fetchFeedPublicInventory,
  formatFeedLimit,
  getFeedDisplayName,
  type FeedInventoryCategory,
  type FeedInventoryItem,
  type FeedPublicInventory,
} from "@/lib/feed-public-inventory";
import { cn } from "@/lib/utils";

const dietaryFlags: Array<{
  key: keyof FeedInventoryItem["dietaryFlags"];
  label: string;
  icon: LucideIcon;
}> = [
  { key: "glutenFree", label: "Gluten-free", icon: WheatOff },
  { key: "vegan", label: "Vegan", icon: Vegan },
  { key: "vegetarian", label: "Vegetarian", icon: Carrot },
  { key: "halal", label: "Halal", icon: MoonStar },
  { key: "kosher", label: "Kosher", icon: Star },
  { key: "organic", label: "Organic", icon: Sprout },
  { key: "readyToEat", label: "Ready to eat", icon: UtensilsCrossed },
];

function formatInventoryFreshness(input: string, language: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const locale = language === "zh" ? "zh-CN" : language === "fa" ? "fa-IR" : language === "ar" ? "ar" : language;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function matchesInventorySearch(category: FeedInventoryCategory, item: FeedInventoryItem, language: ReturnType<typeof useLanguage>["language"], query: string): boolean {
  if (!query) return true;
  const normalizedQuery = query.toLocaleLowerCase();
  return [getFeedDisplayName(category, language), category.name, getFeedDisplayName(item, language), item.name]
    .join(" ")
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

function getFilteredCategories(
  inventory: FeedPublicInventory,
  language: ReturnType<typeof useLanguage>["language"],
  query: string,
): FeedInventoryCategory[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return inventory.categories;
  return inventory.categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => matchesInventorySearch(category, item, language, trimmedQuery)),
    }))
    .filter((category) => category.items.length > 0);
}

function InventoryStatusBadges({ item }: { item: FeedInventoryItem }) {
  if (!item.statusTags.limited && !item.statusTags.clearance) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {item.statusTags.limited ? (
        <Badge variant="warning" aria-label="Limited">
          <AlertTriangle className="size-3" aria-hidden="true" />
          <span className="sr-only">Limited</span>
        </Badge>
      ) : null}
      {item.statusTags.clearance ? (
        <Badge variant="danger" aria-label="Clearance">
          <Tag className="size-3" aria-hidden="true" />
          <span className="sr-only">Clearance</span>
        </Badge>
      ) : null}
    </div>
  );
}

function InventoryDietaryFlags({ item }: { item: FeedInventoryItem }) {
  const activeFlags = dietaryFlags.filter(({ key }) => item.dietaryFlags[key]);
  if (activeFlags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {activeFlags.map(({ key, label, icon: Icon }) => (
        <Badge key={key} variant="outline" aria-label={label}>
          <Icon className="size-3" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </Badge>
      ))}
    </div>
  );
}

function InventoryLegend() {
  return (
    <Card className="gap-4 rounded-lg py-4">
      <CardContent className="space-y-4 px-4 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Status</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="warning">
              <AlertTriangle className="size-3" aria-hidden="true" />
              Limited
            </Badge>
            <Badge variant="danger">
              <Tag className="size-3" aria-hidden="true" />
              Clearance
            </Badge>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Dietary</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {dietaryFlags.map(({ key, label, icon: Icon }) => (
              <Badge key={key} variant="outline">
                <Icon className="size-3" aria-hidden="true" />
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryCategoryTable({ category }: { category: FeedInventoryCategory }) {
  const { language } = useLanguage();
  const categoryName = getFeedDisplayName(category, language);
  const categoryLimit = formatFeedLimit(category.limit, category.limitType);

  return (
    <Card className="gap-4 overflow-hidden rounded-lg py-0">
      <CardHeader className="border-b bg-muted/45 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-xl leading-tight">{categoryName}</CardTitle>
            {categoryLimit ? <p className="mt-1 text-sm text-muted-foreground">{categoryLimit}</p> : null}
          </div>
          <Badge variant="secondary">{category.items.length} items</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden sm:block">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b bg-background/70 text-left text-xs font-semibold uppercase text-muted-foreground">
                <th className="w-[34%] px-4 py-2">Item</th>
                <th className="w-[18%] px-4 py-2">Limit</th>
                <th className="w-[18%] px-4 py-2">Status</th>
                <th className="px-4 py-2">Dietary</th>
              </tr>
            </thead>
            <tbody>
              {category.items.map((item, index) => (
                <tr key={item.id} className={cn("border-b last:border-b-0", index % 2 === 0 && "bg-muted/25")}>
                  <td className="px-4 py-3 font-medium">{getFeedDisplayName(item, language)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatFeedLimit(item.limit, item.limitType)}</td>
                  <td className="px-4 py-3">
                    <InventoryStatusBadges item={item} />
                  </td>
                  <td className="px-4 py-3">
                    <InventoryDietaryFlags item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y sm:hidden">
          {category.items.map((item) => (
            <div key={item.id} className="space-y-2 px-4 py-4">
              <div className="font-medium">{getFeedDisplayName(item, language)}</div>
              {formatFeedLimit(item.limit, item.limitType) ? (
                <div className="text-sm text-muted-foreground">{formatFeedLimit(item.limit, item.limitType)}</div>
              ) : null}
              <InventoryStatusBadges item={item} />
              <InventoryDietaryFlags item={item} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PublicInventoryPage() {
  const { language } = useLanguage();
  const [inventory, setInventory] = React.useState<FeedPublicInventory | null>(null);
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadInventory = React.useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setInventory(await fetchFeedPublicInventory());
    } catch {
      setError("Current inventory could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const filteredCategories = React.useMemo(
    () => (inventory ? getFilteredCategories(inventory, language, query) : []),
    [inventory, language, query],
  );
  const freshness = inventory ? formatInventoryFreshness(inventory.generatedAt, language) : "";

  return (
    <main dir={isRTL(language) ? "rtl" : "ltr"} lang={language} className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/new">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <LanguageSwitcher enableHaptics />
            <ThemeSwitcher enableHaptics />
          </div>
        </header>

        <section className="mt-8 flex flex-col gap-5 sm:mt-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <PackageSearch className="size-4" />
                Pantry inventory
              </div>
              <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">What&apos;s in stock today</h1>
              <p className="mt-3 text-base text-muted-foreground">
                Available pantry items from FEED, grouped by category.
              </p>
              {freshness ? (
                <p className="mt-2 text-sm text-muted-foreground">Updated: {freshness}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search inventory"
                aria-label="Search inventory"
                className="h-11 sm:w-72"
              />
              <Button type="button" variant="outline" className="h-11 gap-2" onClick={loadInventory} disabled={isLoading}>
                <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {inventory ? (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{inventory.totals.categories} categories</Badge>
              <Badge variant="secondary">{inventory.totals.foodItems} items</Badge>
            </div>
          ) : null}
        </section>

        <section className="mt-6 flex flex-1 flex-col gap-4 pb-10">
          {isLoading && !inventory ? (
            <Card className="rounded-lg">
              <CardContent className="py-8 text-center text-muted-foreground">Loading current inventory...</CardContent>
            </Card>
          ) : null}

          {error ? (
            <Card className="rounded-lg border-destructive/40">
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button type="button" onClick={loadInventory}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && inventory && inventory.categories.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="py-8 text-center text-muted-foreground">
                No pantry inventory is currently listed as available.
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && inventory && inventory.categories.length > 0 && filteredCategories.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="py-8 text-center text-muted-foreground">
                No available items match your search.
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && inventory && filteredCategories.length > 0 ? <InventoryLegend /> : null}

          {filteredCategories.map((category) => (
            <InventoryCategoryTable key={category.id} category={category} />
          ))}
        </section>
      </div>
    </main>
  );
}
