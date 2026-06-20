import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: ['src/api.ts', 'src/cf-updater.ts'],
  format: ['esm'],
  target: 'node24',
  dts: true,
  clean: true,
  fixedExtension: false,
})
