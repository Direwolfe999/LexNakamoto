'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const TOUR_STEPS = [
  {
    step: 1,
    title: "Welcome to LexNakamoto",
    description: "Escrow secures funds. They are only released when both parties agree conditions are met.",
    targetElement: "tour-welcome",
    position: "bottom",
    action: "none"
  },
  {
    step: 2,
    title: "Create Escrow",
    description: "Click here to set up a new milestone-based escrow. The funds will be locked securely on Bitcoin.",
    targetElement: "tour-new-escrow",
    position: "bottom",
    action: "click"
  },
  {
    step: 3,
    title: "Escrow Details",
    description: "Enter the recipient's address, the sBTC amount, and the terms of release.",
    targetElement: "tour-escrow-form",
    position: "right",
    action: "input"
  },
  {
    step: 4,
    title: "Sponsor Gas",
    description: "You don't need STX to transact! Turn this on to have the platform pay your network fees.",
    targetElement: "tour-sponsor-gas",
    position: "bottom",
    action: "click"
  },
  {
    step: 5,
    title: "Confirm Transaction",
    description: "Once submitted, it'll take a few minutes for Bitcoin finality. A toast will confirm success.",
    targetElement: "tour-confirm-tx",
    position: "top",
    action: "click"
  },
  {
    step: 6,
    title: "Track Escrow",
    description: "Your active escrows appear here. You can track their status and Bitcoin finality in real-time.",
    targetElement: "tour-escrow-list",
    position: "top",
    action: "none"
  },
  {
    step: 7,
    title: "Completion",
    description: "When conditions are met, click 'Release Funds' to disburse the locked sBTC to the recipient.",
    targetElement: "tour-escrow-card",
    position: "bottom",
    action: "none"
  }
];

export default function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('lexnakamoto_tour_seen');
    if (!hasSeenTour) {
      setTimeout(() => setIsVisible(true), 1500);
    }
  }, []);

  const updatePosition = () => {
    if (!isVisible) return;
    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(`[data-tour="${step.targetElement}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStep, isVisible]);

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('lexnakamoto_tour_seen', 'true');
  };

  const handleReplay = () => {
    setCurrentStep(0);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={handleNext} />
        
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-[110] w-80 rounded-2xl border border-white/10 bg-black/95 p-6 backdrop-blur-xl shadow-2xl pointer-events-auto"
            style={{
              top: step.position === 'bottom' ? targetRect.bottom + 16 : 
                   step.position === 'top' ? targetRect.top - 180 : 
                   targetRect.top,
              left: step.position === 'right' ? targetRect.right + 16 : 
                    step.position === 'left' ? targetRect.left - 336 : 
                    targetRect.left + (targetRect.width / 2) - 160,
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                Step {step.step} of {TOUR_STEPS.length}
              </span>
              <button onClick={handleComplete} className="text-xs text-white/40 hover:text-white">Skip Tour</button>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
            <p className="text-sm text-white/70 mb-6">{step.description}</p>
            
            <div className="flex items-center justify-between">
              {currentStep > 0 ? (
                <button
                  onClick={() => setCurrentStep(c => c - 1)}
                  className="text-sm font-medium text-white/50 hover:text-white"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              
              <button
                onClick={handleNext}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-orange-400"
              >
                {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
