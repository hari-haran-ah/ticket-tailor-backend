import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="card w-full max-w-md bg-black border-red-500/20 shadow-[0_0_80px_-15px_rgba(239,68,68,0.3)] overflow-hidden animate-in zoom-in duration-300 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-zinc-600 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="p-10 text-center space-y-8">
                    <div className="w-20 h-20 rounded-[32px] bg-red-500/10 flex items-center justify-center text-red-500 mx-auto border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                        <AlertTriangle size={40} strokeWidth={2.5} />
                    </div>

                    <div className="space-y-4">
                        <span className="text-red-500 text-[10px] font-black uppercase tracking-[0.5em] italic">Critical Operation</span>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{title || 'Confirm Purge'}</h2>
                        <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                            {message || 'Confirm permanent deletion. This action cannot be reversed within the nexus.'}
                        </p>
                    </div>
                </div>

                <div className="p-10 bg-white/2 flex flex-col gap-4">
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="w-full py-5 rounded-3xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[11px] italic shadow-xl shadow-red-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing Purge...
                            </>
                        ) : (
                            'Confirm & Purge Data'
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full py-4 rounded-3xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase tracking-widest text-[10px] italic transition-all disabled:opacity-50"
                    >
                        Abort Operation
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
