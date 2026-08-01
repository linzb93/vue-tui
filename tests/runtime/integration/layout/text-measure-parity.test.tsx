import { defineComponent } from "vue";
import { expect, test } from "vite-plus/test";
import { render } from "@vue-tui/testing";
import { Box, Text } from "@vue-tui/runtime";
import stripAnsi from "strip-ansi";

test("multi-line truncate text keeps its line count (height)", async () => {
  const { lastFrame } = await render(
    defineComponent(() => () => (
      <Box width={24}>
        <Text wrap="truncate">{"x\nyhello"}</Text>
      </Box>
    )),
    { columns: 100 },
  );
  const lines = stripAnsi(lastFrame({ trimLines: true })!).split("\n");
  expect(lines.length).toBe(2);
  expect(lines[0]).toBe("x");
  expect(lines[1]).toBe("yhello");
});

// The public contract deliberately differs from Ink's doubly-truncated
// multiline quirk: each hard line keeps the final Box content width and is
// truncated independently, so a short first line cannot shrink a later line's
// budget or discard it.
test("narrow truncate keeps the final width budget for every hard line", async () => {
  const { lastFrame } = await render(
    defineComponent(() => () => (
      <Box width={5}>
        <Text wrap="truncate">{"x\nyhello"}</Text>
      </Box>
    )),
    { columns: 100 },
  );
  const lines = stripAnsi(lastFrame()!).split("\n");
  expect(lines[0]).toBe("x");
  expect(lines[1]).toBe("yhel…");
});

// Ink measure-text.tsx returns height 0 for empty text (text.length === 0), and
// the yoga measure func short-circuits raw === "" to {width:0,height:0}. So an
// empty <Text> in a column contributes NO row — the only visible line is the
// non-empty sibling, with NO leading blank line above it.
test("empty <Text> in a column contributes height 0 (no leading blank line)", async () => {
  const { lastFrame } = await render(
    defineComponent(() => () => (
      <Box flexDirection="column">
        <Text>{""}</Text>
        <Text>hello</Text>
      </Box>
    )),
    { columns: 100 },
  );
  // Single line "hello" — the empty text adds no row above it.
  expect(lastFrame()).toBe("hello");
});

test("childless <Text /> does not create a flex gap", async () => {
  const { lastFrame } = await render(
    defineComponent(() => () => (
      <Box gap={1}>
        <Text />
        <Text>hello</Text>
      </Box>
    )),
    { columns: 100 },
  );
  expect(lastFrame()).toBe("hello");
});

test("wraps against the rounded parent content width without a stale row", async () => {
  const { lastFrame } = await render(
    defineComponent(() => () => (
      <Box flexDirection="column">
        <Box width={10}>
          <Box flexBasis="42.5%" flexDirection="column">
            <Text>build</Text>
          </Box>
        </Box>
        <Text>after</Text>
      </Box>
    )),
    { columns: 20 },
  );
  expect(lastFrame()).toBe("buil\nd\nafter");
});

test("keeps measurement and paint in sync from a fractional horizontal offset", async () => {
  const { lastFrame } = await render(
    defineComponent(() => () => (
      <Box flexDirection="column">
        <Box width={10}>
          <Box flexBasis="7.5%" flexShrink={0} />
          <Box flexBasis="45%" flexDirection="column" flexShrink={0}>
            <Text>123456</Text>
          </Box>
        </Box>
        <Text>after</Text>
      </Box>
    )),
    { columns: 20 },
  );
  expect(lastFrame()).toBe(" 1234\n 56\nafter");
});

test("does not clip text that rounds wider than an overflow-hidden parent", async () => {
  const { lastFrame } = await render(
    defineComponent(() => () => (
      <Box flexDirection="column">
        <Box width={10}>
          <Box flexBasis="7.5%" flexShrink={0}>
            <Text>x</Text>
          </Box>
          <Box flexBasis="42.5%" flexDirection="column" flexShrink={0} overflow="hidden">
            <Text>build</Text>
          </Box>
        </Box>
        <Text>after</Text>
      </Box>
    )),
    { columns: 20 },
  );
  expect(lastFrame()).toBe("xbuil\n d\nafter");
});

test("remeasures sub-cell constraints against their final one-cell parent", async () => {
  const { lastFrame } = await render(
    defineComponent(() => () => (
      <Box flexDirection="column">
        <Box width={2}>
          <Box flexBasis="25%" flexShrink={0} flexDirection="column" overflow="hidden">
            <Text>012345</Text>
          </Box>
        </Box>
        <Text>after</Text>
      </Box>
    )),
    { columns: 20 },
  );
  expect(lastFrame()).toBe("0\n1\n2\n3\n4\n5\nafter");
});
