<script setup lang="ts">
import { Table, type TableColumn } from "../../src/index.ts";

interface Row {
  name: string;
  age: number;
}

const data: Row[] = [{ name: "Ada", age: 36 }];
const columns = [
  { key: "name", headerStyle: { bold: true } },
  {
    key: "age",
    label: "Years",
    align: "right",
    cellStyle: (value: number) => ({ color: value >= 18 ? "green" : "yellow" }),
  },
] satisfies readonly TableColumn<Row>[];

type HeterogeneousRow = { kind: "named"; name: string } | { kind: "aged"; age: number };
const heterogeneousData: HeterogeneousRow[] = [
  { kind: "named", name: "Ada" },
  { kind: "aged", age: 36 },
];
const heterogeneousColumns = [
  { key: "name" },
  { key: "age" },
] satisfies readonly TableColumn<HeterogeneousRow>[];
</script>

<template>
  <Table :data="data" :columns="columns" :padding="1" />
  <Table :data="heterogeneousData" :columns="heterogeneousColumns" />
  <Table :data="heterogeneousData" :columns="[{ key: 'name' }, { key: 'age' }]" />
  <!-- @vue-expect-error A column key must exist on the inferred row. -->
  <Table :data="data" :columns="[{ key: 'missing' }]" />
  <!-- @vue-expect-error Padding is numeric. -->
  <Table :data="data" padding="1" />
</template>
