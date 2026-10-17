import { LoadingScreen } from "@/components/spinner";

/** The old plate-and-chicken page is gone. After login the person now sees the white spinner page. */
export function PlateLoader(_props: { message?: string }) {
  return <LoadingScreen />;
}
