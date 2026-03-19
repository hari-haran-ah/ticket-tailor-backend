import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

const Toast = ({ show, message, onClose, duration = 3000 }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    return (
        <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-top-4 slide-in-from-right-full duration-500 ease-out">
            <div className="relative overflow-hidden flex items-center justify-between gap-4 bg-white dark:bg-[#212121] border border-gray-300 dark:border-white/10 pl-5 pr-4 py-4 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] backdrop-blur-md min-w-[280px]">
                <div className="flex flex-col gap-0.5">
                    <h4 className="text-black dark:text-white font-bold text-[13px] uppercase tracking-wider">Success</h4>
                    <p className="text-gray-600 dark:text-white/70 text-sm">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-white/40 hover:text-black hover:bg-gray-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
                >
                    <X size={16} />
                </button>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-black/10 dark:bg-white/20 animate-progress-bar" style={{ animationDuration: `${duration}ms` }}></div>
            </div>

            <style jsx>{`
                @keyframes progress-bar {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .animate-progress-bar {
                    animation-name: progress-bar;
                    animation-timing-function: linear;
                }
            `}</style>
        </div>
    );
};

export default Toast;
