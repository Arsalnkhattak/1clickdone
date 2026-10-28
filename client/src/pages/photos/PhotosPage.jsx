/**
 * PhotosPage — unified photo studio with tabs:
 *   • Passport Photos   — 35x45mm, 2x2in, custom sizes, background changer
 *   • Portrait & Photos — custom size photo prints with grid layout
 */
import { useState } from 'react';
import PassportStudioPage from '../services/PassportStudioPage';
import PortraitStudioPage from '../services/PortraitStudioPage';
import { HiOutlineCamera, HiOutlinePhotograph } from 'react-icons/hi';

const TABS = [
  { id: 'passport',  label: 'Passport Photos',    icon: HiOutlineCamera },
  { id: 'portrait',  label: 'Portrait & Photos',  icon: HiOutlinePhotograph },
];

export default function PhotosPage() {
  const [activeTab, setActiveTab] = useState('passport');

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineCamera className="w-7 h-7 text-blue-600" />
          Photo Studio
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Passport photos with background changer, portrait prints, custom size photo layouts
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content — render existing pages directly */}
      <div>
        {activeTab === 'passport' && <PassportStudioPage />}
        {activeTab === 'portrait' && <PortraitStudioPage />}
      </div>
    </div>
  );
}
