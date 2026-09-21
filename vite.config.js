import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset paths relative, so a `dist` build also works when
// served from a subpath such as https://user.github.io/harmonograph/
export default defineConfig({
  plugins: [react()],
  base: "./",
});
