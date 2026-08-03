<script setup lang="ts">
import { computed } from "vue";
import { Box, Text, type BoxProps } from "@vue-tui/runtime";
import { tableProps } from "./table-props.ts";
import { resolveTableLayout } from "./table.ts";

const props = defineProps(tableProps);
const layout = computed(() => resolveTableLayout(props.data, props.columns, props.padding));

type BorderCharacters = Exclude<NonNullable<BoxProps["borderStyle"]>, string>;

function borderStyle(rowIndex: number, columnIndex: number): BorderCharacters {
  const firstRow = rowIndex === 0;
  const firstColumn = columnIndex === 0;
  return {
    topLeft: firstRow ? (firstColumn ? "┌" : "┬") : firstColumn ? "├" : "┼",
    top: "─",
    topRight: firstRow ? "┐" : "┤",
    right: "│",
    bottomRight: "┘",
    bottom: "─",
    bottomLeft: firstColumn ? "└" : "┴",
    left: "│",
  };
}
</script>

<template>
  <Box v-if="layout.rows.length > 0" flex-direction="column" overflow="hidden">
    <Box
      v-for="(row, rowIndex) in layout.rows"
      :key="rowIndex"
      flex-direction="row"
      align-items="stretch"
      width="100%"
      overflow="hidden"
    >
      <Box
        v-for="(cell, columnIndex) in row"
        :key="columnIndex"
        :border-style="borderStyle(rowIndex, columnIndex)"
        :border-right="columnIndex === layout.columns.length - 1"
        :border-bottom="rowIndex === layout.rows.length - 1"
        :padding-x="layout.padding"
        :flex-basis="layout.columns[columnIndex].flexBasis"
        :flex-shrink="layout.columns[columnIndex].flexShrink"
        :min-width="layout.columns[columnIndex].minWidth"
        :min-height="2 + (rowIndex === layout.rows.length - 1 ? 1 : 0)"
        flex-direction="column"
        overflow="hidden"
      >
        <Text
          :color="cell.style?.color"
          :background-color="cell.style?.backgroundColor"
          :dim-color="cell.style?.dimColor"
          :bold="cell.style?.bold"
          :italic="cell.style?.italic"
          :underline="cell.style?.underline"
          :strikethrough="cell.style?.strikethrough"
          :inverse="cell.style?.inverse"
          :text-align="layout.columns[columnIndex].textAlign"
          :wrap="layout.columns[columnIndex].wrap"
        >
          {{ cell.text }}
        </Text>
      </Box>
    </Box>
  </Box>
</template>
