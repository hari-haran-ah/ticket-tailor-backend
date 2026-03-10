import React from 'react';
import { LogOut, X } from 'lucide-react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="card w-full max-w-sm bg-dark-900 border-white/5 shadow-2xl overflow-hidden animate-in zoom-in duration-300 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary-600/20 flex items-center justify-center text-primary-400 mx-auto border border-primary-600/20">
                        <LogOut size={32} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">Confirm Logout</h2>
                        <p className="text-white/40 text-sm">
                            Are you sure you want to log out? You will need to sign in again to access the admin panel.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-white/2 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm shadow-lg shadow-primary-600/20 transition-all"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
