import { Calendar, Bell, User, MapPin, LogOut } from 'lucide-react';

export function TopBar({ currentUser, onLogout }) {
  // Format current date in Indonesian
  const getCurrentDate = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    
    return `${dayName}, ${day} ${month} ${year}`;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Left - Date */}
        <div className="flex items-center gap-2 text-gray-700">
          <Calendar className="w-5 h-5" />
          <span className="text-sm font-medium">{getCurrentDate()}</span>
        </div>

        {/* Right - User Info & Actions */}
        <div className="flex items-center gap-6">
          {/* Notifications */}
          <button className="relative hover:bg-gray-100 p-2 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Branch */}
          <div className="flex items-center gap-2 text-gray-700">
            <User className="w-5 h-5" />
            <span className="text-sm font-medium">{currentUser.branch} Branch</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="w-5 h-5" />
            <span className="text-sm font-medium">{currentUser.branch}</span>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopBar;