const vitestConfig = {
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
};

export default vitestConfig;
