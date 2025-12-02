import { ThemeService } from '../services/theme.service';

/**
 * Utility class for generating theme-aware chart colors
 */
export class ChartColorsUtil {
  /**
   * Get chart colors based on current theme
   */
  static getChartColors(themeService: ThemeService): {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    palette: string[];
    borderColor: string;
    backgroundColor: string;
  } {
    const isDark = themeService.getEffectiveTheme() === 'dark';
    
    if (isDark) {
      return {
        primary: '#4A9EFF',
        secondary: '#6BB0FF',
        accent: '#FFC107',
        success: '#66BB6A',
        warning: '#FFA726',
        error: '#EF5350',
        info: '#42A5F5',
        palette: [
          '#4A9EFF', // Primary Blue
          '#FFC107', // Amber
          '#FFA726', // Orange
          '#42A5F5', // Blue
          '#66BB6A', // Green
          '#BA68C8', // Purple
          '#EF5350', // Red
          '#26C6DA', // Cyan
          '#FF7043', // Deep Orange
          '#9575CD', // Deep Purple
          '#F06292', // Pink
          '#26A69A', // Teal
          '#5C6BC0', // Indigo
          '#A1887F', // Brown
          '#78909C'  // Blue Grey
        ],
        borderColor: '#2D2D2D',
        backgroundColor: 'rgba(74, 158, 255, 0.1)'
      };
    } else {
      return {
        primary: '#0A1A3A',
        secondary: '#1a2a4a',
        accent: '#FFC107',
        success: '#2e7d32',
        warning: '#F57F17',
        error: '#d32f2f',
        info: '#2196F3',
        palette: [
          '#0A1A3A', // Navy Blue
          '#FFC107', // Amber
          '#FF9800', // Orange
          '#2196F3', // Blue
          '#4CAF50', // Green
          '#9C27B0', // Purple
          '#F44336', // Red
          '#00BCD4', // Cyan
          '#FF5722', // Deep Orange
          '#673AB7', // Deep Purple
          '#E91E63', // Pink
          '#009688', // Teal
          '#3F51B5', // Indigo
          '#795548', // Brown
          '#607D8B'  // Blue Grey
        ],
        borderColor: '#ffffff',
        backgroundColor: 'rgba(10, 26, 58, 0.1)'
      };
    }
  }

  /**
   * Get a color from the palette by index (with wrapping)
   */
  static getPaletteColor(index: number, themeService: ThemeService): string {
    const colors = this.getChartColors(themeService);
    return colors.palette[index % colors.palette.length];
  }
}

