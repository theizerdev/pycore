import React, { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';
import type { ApexOptions } from 'apexcharts';

interface ApexChartProps {
  type: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radialBar';
  options: ApexOptions;
  series: any[];
  height?: number | string;
  width?: number | string;
  className?: string;
}

export const ApexChart: React.FC<ApexChartProps> = ({
  type,
  options,
  series,
  height = 300,
  width = '100%',
  className = '',
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ApexCharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Detectar si el tema actual es oscuro
    const isDark = document.documentElement.classList.contains('dark');

    const mergedOptions: ApexOptions = {
      ...options,
      chart: {
        ...options.chart,
        type,
        height,
        width,
        background: 'transparent',
        toolbar: {
          show: false,
          ...options.chart?.toolbar,
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 400,
          animateGradually: {
            enabled: true,
            delay: 150,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
          ...options.chart?.animations,
        },
      },
      theme: {
        mode: isDark ? 'dark' : 'light',
        ...options.theme,
      },
      series,
    };

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const chart = new ApexCharts(chartRef.current, mergedOptions);
    chart.render();
    chartInstance.current = chart;

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [type, JSON.stringify(options), JSON.stringify(series), height, width]);

  return <div ref={chartRef} className={className} />;
};

export default ApexChart;
