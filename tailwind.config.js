/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vscode: {
          editor: '#1e1e1e',
          sidebar: '#252526',
          titlebar: '#1f1f1f',
          activity: '#333333',
          panel: '#1e1e1e',
          input: '#3c3c3c',
          inputFocus: '#007fd4',
          border: '#2d2d2d',
          hover: '#2a2d2e',
          selected: '#37373d',
          blue: '#007acc',
          blueHover: '#1177bb',
          fg: '#cccccc',
          fgMuted: '#858585',
          fgBright: '#ffffff',
          teal: '#4ec9b0',
          yellow: '#dcdcaa',
          purple: '#c586c0',
          orange: '#ce9178',
          green: '#6a9955',
          lightBlue: '#9cdcfe',
        },
        agent: {
          a: {
            DEFAULT: '#569cd6', // VS Code keyword blue
            bg: '#182d40',
            text: '#9cdcfe',
            border: '#264f78',
          },
          b: {
            DEFAULT: '#4ec9b0', // VS Code type teal
            bg: '#143831',
            text: '#a2edd9',
            border: '#246b5d',
          },
          q: {
            DEFAULT: '#ce9178', // VS Code string terracotta/orange
            bg: '#3e2a22',
            text: '#f2c7b6',
            border: '#7c4c3b',
          },
          d: {
            DEFAULT: '#c586c0', // VS Code control purple
            bg: '#372135',
            text: '#ebc0e7',
            border: '#6f3e6a',
          },
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"Cascadia Code"',
          '"JetBrains Mono"',
          '"Fira Code"',
          'Consolas',
          '"Courier New"',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
