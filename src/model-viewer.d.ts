import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        "auto-rotate"?: boolean;
        "rotation-per-second"?: string;
        "camera-controls"?: boolean;
        "touch-action"?: string;
        "shadow-intensity"?: string | number;
        exposure?: string | number;
        "camera-orbit"?: string;
        "field-of-view"?: string;
        "interaction-prompt"?: string;
      };
    }
  }
}

