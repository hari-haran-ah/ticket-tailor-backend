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
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-full duration-500 ease-out">
            <div className="flex items-center gap-4 bg-[#1a1c2e] border border-green-500/20 px-6 py-4 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5),0_0_20px_rgba(34,197,94,0.1)] backdrop-blur-md">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                    <CheckCircle2 size={24} className="animate-pulse" />
                </div>
                <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest">Success</h4>
                    <p className="text-white/60 text-sm whitespace-nowrap">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="ml-4 p-1 text-white/20 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-green-500/50 rounded-full animate-progress-bar" style={{ animationDuration: `${duration}ms` }}></div>
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
