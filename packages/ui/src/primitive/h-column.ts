import { definePrimitive } from "@ui-sdk/core";

type HColumnCellProps = {
  h?: "start" | "center" | "end" | "stretch";
  v?: "top" | "center" | "bottom" | "stretch";
};

const hColumn = definePrimitive({
  name: "h-column",
  state: () => ({}),
  api: () => ({}),
  slots: (slot) => ({
    root: slot({}),
    cell: slot<HColumnCellProps>({
      props: {
        h: "string",
        v: "string",
      },
      attrs: (_state, { props }) => ({
        "data-h": props.h,
        "data-v": props.v,
      }),
    }),
  }),
});

export { hColumn };
export type { HColumnCellProps };
