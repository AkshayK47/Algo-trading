/**
 * NSE Market Calendar & Session Resolver
 *
 * Handles trading hours, weekend / non-trading day detection,
 * and deterministic anchoring to the latest completed trading session.
 */

export interface MarketSessionInfo {
  isTradingDay: boolean;
  isMarketOpen: boolean;
  dayOfWeek: string;
  isWeekend: boolean;
  calendarDate: string; // YYYY-MM-DD
  latestTradingDate: string; // YYYY-MM-DD of latest active market session
  latestTradingDayName: string; // e.g. 'Friday'
  formattedSessionDate: string; // e.g. 'Friday, Sep 04, 2026'
  sessionLabel: string; // e.g. 'Weekend (Sunday) • Market Closed'
  statusBadge: {
    color: 'emerald' | 'amber' | 'zinc';
    text: string;
    subtext: string;
  };
}

/**
 * Derives the active or latest completed NSE market session.
 * Standard NSE trading hours: Mon-Fri 09:15 to 15:30 IST (UTC+5:30).
 */
export function getMarketSessionInfo(referenceDate?: Date): MarketSessionInfo {
  const d = referenceDate ? new Date(referenceDate) : new Date();

  // Convert to IST (UTC + 5:30)
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60000;
  const ist = new Date(utc + istOffset);

  const dayOfWeekNum = ist.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysOfWeek[dayOfWeekNum];
  const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Market hours: 09:15 to 15:30 IST (555 mins to 930 mins)
  const isDuringTradingHours = !isWeekend && timeInMinutes >= 555 && timeInMinutes <= 930;
  const isBeforeOpen = !isWeekend && timeInMinutes < 555;

  // Calculate the latest completed trading session date
  const latestTrading = new Date(ist);

  if (dayOfWeekNum === 0) {
    // Sunday: latest session was Friday (-2 days)
    latestTrading.setDate(latestTrading.getDate() - 2);
  } else if (dayOfWeekNum === 6) {
    // Saturday: latest session was Friday (-1 day)
    latestTrading.setDate(latestTrading.getDate() - 1);
  } else if (dayOfWeekNum === 1 && isBeforeOpen) {
    // Monday pre-market: latest session was Friday (-3 days)
    latestTrading.setDate(latestTrading.getDate() - 3);
  } else if (isBeforeOpen) {
    // Tue-Fri pre-market: latest session was yesterday
    latestTrading.setDate(latestTrading.getDate() - 1);
  }

  const latestTradingDayName = daysOfWeek[latestTrading.getDay()];

  const formatDateYMD = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const calendarDate = formatDateYMD(ist);
  const latestTradingDate = formatDateYMD(latestTrading);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedSessionDate = `${latestTradingDayName}, ${months[latestTrading.getMonth()]} ${String(latestTrading.getDate()).padStart(2, '0')}, ${latestTrading.getFullYear()}`;

  let statusBadge: MarketSessionInfo['statusBadge'];
  let sessionLabel: string;

  if (isDuringTradingHours) {
    statusBadge = {
      color: 'emerald',
      text: 'LIVE NSE SESSION',
      subtext: 'Real-time quantitative momentum scanner active',
    };
    sessionLabel = 'NSE Live Trading Session';
  } else if (isWeekend) {
    statusBadge = {
      color: 'amber',
      text: `MARKET CLOSED (${dayName.toUpperCase()})`,
      subtext: `Deterministic scan anchored to ${latestTradingDayName} close (${formattedSessionDate})`,
    };
    sessionLabel = `Weekend Non-Trading Day (${dayName})`;
  } else {
    statusBadge = {
      color: 'zinc',
      text: 'POST-MARKET (NSE CLOSED)',
      subtext: `Scan anchored to EOD close (${formattedSessionDate})`,
    };
    sessionLabel = 'Post-Market Session';
  }

  return {
    isTradingDay: !isWeekend,
    isMarketOpen: isDuringTradingHours,
    dayOfWeek: dayName,
    isWeekend,
    calendarDate,
    latestTradingDate,
    latestTradingDayName,
    formattedSessionDate,
    sessionLabel,
    statusBadge,
  };
}
