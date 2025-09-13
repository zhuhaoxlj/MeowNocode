import React, { useState, useEffect } from 'react';
import { format, subDays, eachDayOfInterval, isSameDay, getYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const GitHubHeatmap = ({ data }) => {
  const [events, setEvents] = useState({});
  const [availableYears, setAvailableYears] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

  // 处理事件数据
  useEffect(() => {
    const formattedEvents = {};
    data.forEach(item => {
      formattedEvents[item.date] = Array(item.count).fill('想法记录');
    });
    setEvents(formattedEvents);
  }, [data]);

  // 获取可用年份
  useEffect(() => {
    const years = new Set();
    const currentYear = new Date().getFullYear();
    
    Object.keys(events).forEach(dateStr => {
      const year = parseInt(dateStr.split('-')[0]);
      if (year <= currentYear) {
        years.add(year);
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    setAvailableYears(sortedYears);
    if (sortedYears.length > 0) {
      setCurrentYear(sortedYears[0]);
    }
  }, [events]);

  // 生成日历
  const generateCalendar = () => {
    const grid = [];
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);

    // 计算第一周的开始日期（周日开始）
    const firstWeekStart = new Date(startDate);
    firstWeekStart.setDate(startDate.getDate() - startDate.getDay());

    // 计算最后一周的结束日期
    const lastWeekEnd = new Date(endDate);
    lastWeekEnd.setDate(endDate.getDate() + (6 - endDate.getDay()));

    // 按周生成日历
    for (let weekStart = new Date(firstWeekStart); weekStart <= lastWeekEnd; weekStart.setDate(weekStart.getDate() + 7)) {
      const weekColumn = [];
      
      // 为每周的7天创建单元格
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + dayOffset);
        
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const isCurrentYear = getYear(currentDate) === currentYear;
        const eventCount = events[dateStr] ? events[dateStr].length : 0;
        const level = Math.min(eventCount, 4);
        
        weekColumn.push(
          <div 
            key={dateStr}
            className={`calendar-cell level-${level} ${!isCurrentYear ? 'opacity-30' : ''}`}
            onMouseEnter={(e) => showTooltip(e, dateStr, eventCount)}
            onMouseLeave={hideTooltip}
          />
        );
      }
      
      grid.push(
        <div key={weekStart.toString()} className="week-column">
          {weekColumn}
        </div>
      );
    }
    
    return grid;
  };

  // 显示提示
  const showTooltip = (e, date, count) => {
    let content = `${date}\n`;

    if (count === 0) {
      content += '无想法';
    } else {
      content += `${count}条想法`;
    }

    setTooltip({
      show: true,
      content,
      x: e.pageX + 10,
      y: e.pageY - 10
    });
  };

  // 隐藏提示
  const hideTooltip = () => {
    setTooltip({ ...tooltip, show: false });
  };

  // 切换年份
  const changeYear = (delta) => {
    const currentIndex = availableYears.indexOf(currentYear);
    const newIndex = currentIndex - delta;
    
    if (newIndex >= 0 && newIndex < availableYears.length) {
      setCurrentYear(availableYears[newIndex]);
    }
  };

  return (
    <div className="mt-6 font-sans">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => changeYear(1)}
            disabled={availableYears.indexOf(currentYear) >= availableYears.length - 1}
            className="bg-transparent border-none p-1.5 cursor-pointer text-gray-800 transition-all rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ‹
          </button>
          <span className="text-base font-semibold text-gray-800 min-w-[50px] text-center">
            {currentYear}
          </span>
          <button 
            onClick={() => changeYear(-1)}
            disabled={availableYears.indexOf(currentYear) <= 0}
            className="bg-transparent border-none p-1.5 cursor-pointer text-gray-800 transition-all rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
        
        <div className="flex items-center text-xs text-gray-500">
          <span>少</span>
          <div className="flex mx-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div 
                key={level}
                className={`legend-item level-${level} w-2.5 h-2.5 mx-0.5 rounded-sm`}
                title={`${level === 0 ? '无想法' : level === 4 ? '4+条想法' : `${level}条想法`}`}
              />
            ))}
          </div>
          <span>多</span>
        </div>
      </div>

      <div className="p-5 bg-transparent rounded-lg overflow-hidden">
        <div className="flex gap-0.5">
          {generateCalendar()}
        </div>
      </div>

      <div 
        className={`tooltip absolute bg-gray-900 text-white p-2 rounded text-xs pointer-events-none z-50 transition-opacity ${
          tooltip.show ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
      >
        {tooltip.content}
      </div>
    </div>
  );
};

export default GitHubHeatmap;
