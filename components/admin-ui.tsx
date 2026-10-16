import { ComponentProps } from "react";
import { PrimaryButton } from "@/components/ui";
import { ui } from "@/lib/theme";

/** Red action button used on every admin screen (white background). */
export function AdminButton(props: ComponentProps<typeof PrimaryButton>) {
  return <PrimaryButton color={ui.red} textColor="#fff" {...props} />;
}
