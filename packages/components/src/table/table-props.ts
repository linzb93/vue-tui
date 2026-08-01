import type { PropType, VNode, VNodeProps } from "vue";
import type { TextProps } from "@vue-tui/runtime";

type StringKey<Row extends object> = Row extends unknown ? Extract<keyof Row, string> : never;
type CellValue<Row extends object, Key extends StringKey<Row>> = Row extends unknown
  ? Key extends keyof Row
    ? Row[Key]
    : undefined
  : never;

/** Runtime Text presentation accepted by a table header or data cell. */
export type TableTextStyle = Readonly<Omit<TextProps, "textAlign" | "wrap">>;

/** One display column, keyed and formatted against its inferred row type. */
export type TableColumn<Row extends object> = {
  [Key in StringKey<Row>]: {
    readonly key: Key;
    readonly label?: string;
    readonly align?: TextProps["textAlign"];
    readonly wrap?: TextProps["wrap"];
    readonly format?: (value: CellValue<Row, Key>, row: Row) => string;
    readonly headerStyle?: TableTextStyle;
    readonly cellStyle?:
      | TableTextStyle
      | ((value: CellValue<Row, Key>, row: Row) => TableTextStyle | undefined);
  };
}[StringKey<Row>];

/** Props accepted by `<Table>`. */
export interface TableProps<Row extends object = Record<string, unknown>> {
  readonly data: readonly Row[];
  readonly columns?: NoInfer<readonly TableColumn<Row>[]>;
  readonly padding?: number;
}

export interface RuntimeTableColumn {
  readonly key: string;
  readonly label?: string;
  readonly align?: TextProps["textAlign"];
  readonly wrap?: TextProps["wrap"];
  readonly format?: (...args: never[]) => unknown;
  readonly headerStyle?: TableTextStyle;
  readonly cellStyle?: TableTextStyle | ((...args: never[]) => unknown);
}

export const tableProps = {
  data: {
    type: Array as PropType<readonly object[]>,
    required: true as const,
  },
  columns: Array as PropType<readonly RuntimeTableColumn[]>,
  padding: { type: Number, default: 1 },
};

export type TableComponent = <Row extends object>(props: VNodeProps & TableProps<Row>) => VNode;
