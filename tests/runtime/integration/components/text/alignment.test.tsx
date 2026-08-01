import { defineComponent, nextTick, shallowRef } from "vue";
import { expect, test } from "vite-plus/test";
import { render } from "@vue-tui/testing";
import { Box, Text, type TextProps } from "@vue-tui/runtime";
import { Chalk } from "chalk";

const chalk = new Chalk({ level: 3 });

test("aligns every hard-newline and wrapped line within the Text width", async () => {
  const hardBreak = await render(
    defineComponent(() => () => (
      <Box flexDirection="column" width={6}>
        <Text textAlign="right">{"A\nLONG"}</Text>
      </Box>
    )),
  );
  expect(hardBreak.lastFrame()).toBe("     A\n  LONG");

  const wrapped = await render(
    defineComponent(() => () => (
      <Box flexDirection="column" width={4}>
        <Text textAlign="right" wrap="hard">
          ABCDE
        </Text>
      </Box>
    )),
  );
  expect(wrapped.lastFrame()).toBe("ABCD\n   E");
});

test("centers text by terminal display width", async () => {
  const result = await render(
    defineComponent(() => () => (
      <Box flexDirection="column" width={7}>
        <Text textAlign="center">{"中\nx"}</Text>
      </Box>
    )),
  );
  expect(result.lastFrame()).toBe("  中\n   x");
});

test("uses the outermost alignment for composed nested Text", async () => {
  const result = await render(
    defineComponent(() => () => (
      <Box flexDirection="column" width={5}>
        <Text textAlign="right">
          A<Text textAlign="left">B</Text>
        </Text>
      </Box>
    )),
  );
  expect(result.lastFrame()).toBe("   AB");
});

test("keeps an inherited Box background under alignment space", async () => {
  const inherited = await render(
    defineComponent(() => () => (
      <Box backgroundColor="red" flexDirection="column" width={4}>
        <Text textAlign="right">A</Text>
      </Box>
    )),
    { color: "truecolor" },
  );
  expect(inherited.lastFrame()).toBe(chalk.bgRed("   A"));

  const own = await render(
    defineComponent(() => () => (
      <Box flexDirection="column" width={4}>
        <Text backgroundColor="red" textAlign="right">
          A
        </Text>
      </Box>
    )),
    { color: "truecolor" },
  );
  expect(own.lastFrame()).toBe(`   ${chalk.bgRed("A")}`);
});

test("reactively restores left alignment when textAlign is withdrawn", async () => {
  const textAlign = shallowRef<TextProps["textAlign"]>("right");
  const App = defineComponent(() => () => (
    <Box flexDirection="column" width={5}>
      <Text {...(textAlign.value === undefined ? {} : { textAlign: textAlign.value })}>A</Text>
    </Box>
  ));
  const result = await render(App);
  expect(result.lastFrame()).toBe("    A");

  textAlign.value = undefined;
  await nextTick();
  expect(result.lastFrame()).toBe("A");
});
