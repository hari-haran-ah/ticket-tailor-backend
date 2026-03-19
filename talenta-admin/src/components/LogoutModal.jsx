import React from 'react';
import { LogOut, X } from 'lucide-react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="card w-full max-w-sm bg-white dark:bg-[#212121] border-gray-300 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in duration-300 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-black dark:text-white mx-auto border border-gray-300 dark:border-white/10">
                        <LogOut size={32} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">Confirm Logout</h2>
                        <p className="text-gray-600 dark:text-white/50 text-sm">
                            Are you sure you want to log out? You will need to sign in again to access the admin panel.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-white/5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-black dark:text-white font-semibold text-sm transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black font-semibold text-sm shadow-lg transition-all"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
