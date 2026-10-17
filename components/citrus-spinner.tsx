import { Spinner } from "@/components/spinner";

/** Old orange-slice spinner, replaced by the Yango-style ring. Kept so old imports still work. */
export function CitrusSpinner({ size = 54 }: { size?: number }) {
  return <Spinner size={size} />;
}
