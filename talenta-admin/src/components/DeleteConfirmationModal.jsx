import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="card w-full max-w-md bg-white dark:bg-[#212121] border-gray-300 dark:border-white/10 shadow-[0_0_80px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in duration-300 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 dark:text-zinc-600 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="p-10 text-center space-y-8">
                    <div className="w-20 h-20 rounded-[32px] bg-gray-100 dark:bg-white/10 flex items-center justify-center text-black dark:text-white mx-auto border border-gray-300 dark:border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.1)]">
                        <AlertTriangle size={40} strokeWidth={2.5} />
                    </div>

                    <div className="space-y-4">
                        <span className="text-black dark:text-white text-[10px] font-black uppercase tracking-[0.5em] italic">Critical Operation</span>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">{title || 'Confirm Purge'}</h2>
                        <p className="text-gray-600 dark:text-zinc-500 text-sm font-medium leading-relaxed">
                            {message || 'Confirm permanent deletion. This action cannot be reversed within the nexus.'}
                        </p>
                    </div>
                </div>

                <div className="p-10 bg-gray-50 dark:bg-white/5 flex flex-col gap-4">
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="w-full py-5 rounded-3xl bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black font-black uppercase tracking-widest text-[11px] italic shadow-xl shadow-black/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" />
                                Processing Purge...
                            </>
                        ) : (
                            'Confirm & Purge Data'
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full py-4 rounded-3xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] italic transition-all disabled:opacity-50"
                    >
                        Abort Operation
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
