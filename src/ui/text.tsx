import React, { forwardRef } from "react";
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { getDirection } from "../i18n";
// RN mirrors explicit left alignment with RTL layout; centered caller styles win.
const rtl: TextStyle = {
  direction: "rtl",
  writingDirection: "rtl",
  textAlign: "left",
};
export const Text = forwardRef<
  React.ComponentRef<typeof NativeText>,
  TextProps
>(function Text({ style, ...props }, ref) {
  return (
    <NativeText
      {...props}
      ref={ref}
      style={[getDirection() === "rtl" && rtl, style]}
    />
  );
});
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(
  function TextInput({ style, ...props }, ref) {
    const numeric =
      props.keyboardType === "number-pad" ||
      props.keyboardType === "decimal-pad" ||
      props.keyboardType === "numeric" ||
      props.keyboardType === "numbers-and-punctuation";
    return (
      <NativeTextInput
        {...props}
        ref={ref}
        style={[
          getDirection() === "rtl" && [
            rtl,
            numeric && { writingDirection: "ltr" as const },
          ],
          style,
        ]}
      />
    );
  },
);
