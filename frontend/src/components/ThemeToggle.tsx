"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Hydration safety
        const timeout = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timeout);
    }, []);

    if (!mounted) {
        return <div className="p-2 w-9 h-9" />;
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 backdrop-blur-md shadow-sm hover:scale-105 hover:bg-slate-300/50 dark:hover:bg-white/10 transition-all duration-200"
            aria-label="Toggle dark mode"
        >
            {theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-400" />
            ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
            )}
        </button>
    );
}
