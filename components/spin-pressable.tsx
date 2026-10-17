import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import { Spinner } from "@/components/spinner";

/**
 * A button that shows a spinner as soon as it is tapped and ignores taps until it is done.
 * - If `onPress` is async, the spinner stays until it finishes.
 * - If `onPress` is instant (for example opening another screen), the spinner still shows for
 *   `minMs` so the tap never feels dead.
 * Use it for real buttons (fixed height). Big tappable cards should stay plain Pressables.
 */
export function SpinPressable({
  onPress,
  disabled,
  loading,
  style,
  children,
  spinnerColor = "#111",
  minMs = 500,
  hitSlop,
}: {
  onPress?: () => void | Promise<unknown>;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  spinnerColor?: string;
  minMs?: number;
  hitSlop?: number;
}) {
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const lock = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const handle = useCallback(async () => {
    if (lock.current || disabled || loading) return;
    lock.current = true;
    setBusy(true);
    const started = Date.now();
    try {
      await onPress?.();
    } finally {
      const wait = Math.max(0, minMs - (Date.now() - started));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }, [onPress, disabled, loading, minMs]);

  const showSpinner = busy || !!loading;

  return (
    <Pressable
      onPress={handle}
      disabled={disabled || showSpinner}
      hitSlop={hitSlop}
      style={({ pressed }) => [style, { opacity: disabled ? 0.5 : pressed ? 0.88 : 1 }]}
    >
      {showSpinner ? <Spinner size={22} color={spinnerColor} track="rgba(128,128,128,0.25)" /> : children}
    </Pressable>
  );
}
