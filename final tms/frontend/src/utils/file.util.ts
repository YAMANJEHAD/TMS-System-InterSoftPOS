export class FileUtil {
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  static async handleFileUpload(file: File): Promise<{ fileName: string; fileBase64String: string }> {
    const base64 = await this.fileToBase64(file);
    return {
      fileName: file.name,
      fileBase64String: base64,
    };
  }
}

