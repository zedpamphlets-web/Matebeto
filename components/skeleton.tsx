import { LoadingBlock } from "@/components/spinner";

/**
 * Every "loading" placeholder in the app is now the same white page with the Yango-style spinner.
 * The old names are kept so each screen keeps working; they all show the same thing.
 */
export function HomeSkeleton() {
  return <LoadingBlock minHeight={300} />;
}
export function BasketSkeleton() {
  return <LoadingBlock />;
}
export function OrdersSkeleton() {
  return <LoadingBlock />;
}
export function AdminOrdersSkeleton() {
  return <LoadingBlock />;
}
export function FormSkeleton() {
  return <LoadingBlock minHeight={400} />;
}
export function ListSkeleton(_props: { rows?: number; dark?: boolean }) {
  return <LoadingBlock minHeight={360} />;
}
export function CategoriesSkeleton() {
  return <LoadingBlock minHeight={420} />;
}
export function DetailSkeleton() {
  return <LoadingBlock minHeight={520} />;
}
export function JobSkeleton() {
  return <LoadingBlock minHeight={420} />;
}
