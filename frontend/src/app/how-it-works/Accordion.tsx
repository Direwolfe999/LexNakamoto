"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AccordionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

export function Accordion({ title, icon, children }: AccordionProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-gray-300 dark:hover:border-white/20">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 focus:outline-none"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl">
                        {icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-left">
                        {title}
                    </h3>
                </div>
                <ChevronDown
                    className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-white/5">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
