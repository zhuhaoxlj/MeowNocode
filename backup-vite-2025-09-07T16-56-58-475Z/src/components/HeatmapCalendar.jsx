import React from 'react';
import { 
  ResponsiveContainer, 
  Tooltip, 
  Rectangle 
} from 'recharts';
import { 
  format, 
  subDays, 
  eachDayOfInterval,
  isSameDay
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

const HeatmapCalendar = ({ data }) => {
  // 计算颜色强度
  const getColorIntensity = (count) => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 3) return 'bg-indigo-200';
    if (count <= 6) return 'bg-indigo-400';
    return 'bg-indigo-600';
  };

  // 生成日历网格
  const generateCalendar = () => {
    const today = new Date();
    const startDate = subDays(today, 364);
    const days = eachDayOfInterval({ start: startDate, end: today });
    
    const weeks = [];
    let week = [];
    
    days.forEach((day, index) => {
      const dayData = data.find(d => 
        isSameDay(new Date(d.date), day)
      );
      
      week.push({
        date: day,
        count: dayData ? dayData.count : 0
      });
      
      if ((index + 1) % 7 === 0 || index === days.length - 1) {
        weeks.push(week);
        week = [];
      }
    });
    
    return weeks;
  };

  const calendarWeeks = generateCalendar();
  const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {monthLabels.map((month, index) => (
          <div key={index} className="text-xs text-gray-500 w-1/12 text-center">
            {index % 2 === 0 ? month : ''}
          </div>
        ))}
      </div>
      
      <div className="flex">
        <div className="flex flex-col mr-1 justify-between text-xs text-gray-500">
          <span>日</span>
          <span>三</span>
          <span>五</span>
        </div>
        
        <div className="flex-1">
          {calendarWeeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex">
              {week.map((day, dayIndex) => (
                <div 
                  key={`${weekIndex}-${dayIndex}`}
                  className={`w-3 h-3 m-0.5 rounded-sm ${getColorIntensity(day.count)}`}
                  title={`${format(day.date, 'yyyy-MM-dd')}: ${day.count}条想法`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 text-xs">
        <span>较少</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
          <div className="w-3 h-3 bg-indigo-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-indigo-400 rounded-sm"></div>
          <div className="w-3 h-3 bg-indigo-600 rounded-sm"></div>
        </div>
        <span>较多</span>
      </div>
    </div>
  );
};

export default HeatmapCalendar;
