/**
 * Utility functions for exporting data to Excel
 */

export class ExcelUtil {
  /**
   * Export data to Excel file
   * @param data Array of objects to export
   * @param filename Name of the file (without extension)
   * @param headers Optional custom headers mapping { displayName: 'propertyName' }
   */
  static exportToExcel(
    data: any[],
    filename: string = 'export',
    headers?: { [key: string]: string }
  ): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get all unique keys from data
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    // Create CSV content
    let csvContent = '';

    // Add headers
    if (headers) {
      const headerRow = Object.keys(headers).map(displayName => {
        return this.escapeCSV(displayName);
      });
      csvContent += headerRow.join(',') + '\n';
    } else {
      const headerRow = Array.from(allKeys).map(key => {
        return this.escapeCSV(this.formatHeader(key));
      });
      csvContent += headerRow.join(',') + '\n';
    }

    // Add data rows
    data.forEach(item => {
      const row: string[] = [];
      
      if (headers) {
        Object.values(headers).forEach(propertyName => {
          const value = this.getNestedValue(item, propertyName);
          row.push(this.escapeCSV(value));
        });
      } else {
        Array.from(allKeys).forEach(key => {
          const value = item[key];
          row.push(this.escapeCSV(value));
        });
      }
      
      csvContent += row.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Escape CSV value (handle commas, quotes, newlines)
   */
  private static escapeCSV(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    
    return stringValue;
  }

  /**
   * Format header name (convert camelCase to Title Case)
   */
  private static formatHeader(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}

