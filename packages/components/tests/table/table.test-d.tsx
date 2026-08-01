import { Table, type TableColumn, type TableTextStyle } from "../../src/index.ts";

interface Row {
  name: string;
  age: number;
  active: boolean;
}

const data: Row[] = [{ name: "Ada", age: 36, active: true }];
const columns = [
  { key: "name", format: (value) => value.toUpperCase() },
  {
    key: "age",
    align: "right",
    format: (value) => value.toFixed(0),
    headerStyle: { bold: true },
    cellStyle: (value, row) => ({ color: value >= row.age ? "green" : "red" }),
  },
] satisfies readonly TableColumn<Row>[];
const textStyle = {
  color: "cyan",
  backgroundColor: "default",
  bold: true,
} satisfies TableTextStyle;

const supported = <Table data={data} columns={columns} padding={1} />;
const inline = (
  <Table
    data={data}
    columns={[{ key: "active", format: (value) => (value ? "yes" : "no"), wrap: "truncate" }]}
  />
);

// @ts-expect-error A column key must exist on the inferred row.
const unknownKey = <Table data={data} columns={[{ key: "missing" }]} />;
// @ts-expect-error A formatter must return text.
const invalidFormatter = <Table data={data} columns={[{ key: "age", format: () => 36 }]} />;
// @ts-expect-error Wrap reuses Runtime Text's finite modes.
const invalidWrap = <Table data={data} columns={[{ key: "name", wrap: "nowrap" }]} />;
const invalidHeaderStyle = {
  // @ts-expect-error Table text style cannot override column alignment.
  textAlign: "right",
} satisfies TableTextStyle;
// @ts-expect-error A cell-style callback must return structured Text presentation props.
const invalidCellStyle = <Table data={data} columns={[{ key: "age", cellStyle: () => "green" }]} />;
// @ts-expect-error Padding is numeric.
const invalidPadding = <Table data={data} padding="1" />;
// @ts-expect-error Table has a closed attribute surface.
const invalidClass = <Table data={data} class="table" />;
// @ts-expect-error Table has a closed attribute surface.
const invalidStyle = <Table data={data} style={{ color: "red" }} />;

type HeterogeneousRow = { kind: "named"; name: string } | { kind: "aged"; age: number };
const heterogeneousData: HeterogeneousRow[] = [
  { kind: "named", name: "Ada" },
  { kind: "aged", age: 36 },
];
const heterogeneousColumns = [
  { key: "name", format: (value) => value?.toUpperCase() ?? "-" },
  { key: "age", format: (value) => value?.toFixed(0) ?? "-" },
] satisfies readonly TableColumn<HeterogeneousRow>[];
const heterogeneous = <Table data={heterogeneousData} columns={heterogeneousColumns} />;
const heterogeneousInline = (
  <Table
    data={heterogeneousData}
    columns={[
      { key: "name", format: (value) => value?.toUpperCase() ?? "-" },
      { key: "age", format: (value) => value?.toFixed(0) ?? "-" },
    ]}
  />
);

void supported;
void inline;
void unknownKey;
void invalidFormatter;
void invalidWrap;
void invalidHeaderStyle;
void invalidCellStyle;
void invalidPadding;
void invalidClass;
void invalidStyle;
void heterogeneous;
void heterogeneousInline;
void textStyle;
