@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* TradingView-inspired Dark Theme */
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;

  --card: 222 47% 14%;
  --card-foreground: 210 40% 98%;

  --popover: 222 47% 14%;
  --popover-foreground: 210 40% 98%;

  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 11%;

  --secondary: 217 19% 27%;
  --secondary-foreground: 210 40% 98%;

  --muted: 217 19% 27%;
  --muted-foreground: 215 20% 65%;

  --accent: 217 91% 60%;
  --accent-foreground: 222 47% 11%;

  --destructive: 0 84% 60%;
  --destructive-foreground: 210 40% 98%;

  --border: 217 19% 27%;
  --input: 217 19% 27%;
  --ring: 217 91% 60%;

  /* Financial Colors */
  --success: 142 71% 45%;
  --warning: 48 96% 53%;
  --danger: 0 84% 60%;

  --radius: 0.5rem;
}

@layer base {
  body {
    @apply bg-background text-foreground antialiased;
    font-family: var(--font-sans);
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-semibold tracking-tight;
  }
}

@layer utilities {
  .font-mono {
    font-family: var(--font-mono);
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
  
  /* Custom Scrollbar for dark theme */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track {
    @apply bg-background;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-muted rounded-full border-[3px] border-solid border-background;
  }
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-muted-foreground/50;
  }
}

/* Animations */
.animate-in {
  animation: animate-in 0.3s ease-in-out;
}

@keyframes animate-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
