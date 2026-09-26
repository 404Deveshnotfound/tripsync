'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function GoogleAuthButton({ 
  onSuccess, 
  onError,
  text = 'continue_with' // 'signin_with' | 'signup_with' | 'continue_with'
}) {
  const { signInWithGoogleIdToken, signInWithGoogle, isMockMode } = useAuth();
  const buttonRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '850579296642-gsf4brgskjhl0sdj0ilmbh8uql0h752h.apps.googleusercontent.com';

  useEffect(() => {
    let interval = null;

    const initGoogle = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        setScriptReady(true);

        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              setLoading(true);
              try {
                if (response?.credential) {
                  const res = await signInWithGoogleIdToken(response.credential);
                  if (res?.error) {
                    onError?.(res.error.message || 'Failed to authenticate with Google');
                  } else {
                    onSuccess?.(res?.data);
                  }
                }
              } catch (err) {
                console.error('Google token exchange error:', err);
                onError?.(err.message || 'Google authentication error');
              } finally {
                setLoading(false);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (buttonRef.current) {
            buttonRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(buttonRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: text,
              shape: 'rectangular',
              logo_alignment: 'left',
              width: buttonRef.current.offsetWidth || 380,
            });
          }
        } catch (e) {
          console.warn('Google accounts initialization notice:', e);
        }

        if (interval) clearInterval(interval);
      }
    };

    initGoogle();
    interval = setInterval(initGoogle, 300);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [clientId, text, signInWithGoogleIdToken]);

  // Fallback handler if clicked before script renders
  const handleFallbackClick = async () => {
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.error) {
        onError?.(res.error.message);
      }
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[44px]">
      <div 
        ref={buttonRef} 
        className="w-full flex justify-center [&>div]:!w-full [&>div>iframe]:!w-full"
      />

      {/* Fallback button while Google SDK loads or if blocked by adblock */}
      {!scriptReady && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-300 shadow-sm transition flex items-center justify-center gap-3 text-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.56H1.25C.45 8.15 0 9.99 0 12s.45 3.85 1.25 5.44l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.56l4.03 3.15c.95-2.83 3.6-4.96 6.72-4.96z"
            />
          </svg>
          <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
        </button>
      )}
    </div>
  );
}
