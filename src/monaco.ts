import { loader } from '@monaco-editor/react';

const monacoBaseUrl = new URL('./monaco/vs', window.location.href)
  .toString()
  .replace(/\/$/, '');

loader.config({
  paths: {
    vs: monacoBaseUrl,
  },
});
