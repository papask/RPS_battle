'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex gap-2 text-sm z-50">
            <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 rounded border ${i18n.language === 'en' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
            >
                EN
            </button>
            <button
                onClick={() => changeLanguage('ko')}
                className={`px-2 py-1 rounded border ${i18n.language === 'ko' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
            >
                KO
            </button>
        </div>
    );
}
