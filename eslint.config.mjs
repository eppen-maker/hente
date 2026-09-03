import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    rules: {
      // The brand logo and product image are configurable URLs, not build-time
      // assets, so next/image's static optimisation does not apply.
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
