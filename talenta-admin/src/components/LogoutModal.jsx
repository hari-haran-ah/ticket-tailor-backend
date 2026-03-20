import React from 'react';
import { LogOut, X } from 'lucide-react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                className="card w-full max-w-sm overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                    <X size={16} />
                </button>

                <div className="p-5 text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mx-auto">
                        <LogOut size={24} />
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Sign out</h2>
                        <p className="text-zinc-500 text-sm">
                            Are you sure you want to sign out?
                        </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={onClose}
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="btn-primary flex-1"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
