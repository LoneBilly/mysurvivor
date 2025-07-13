export const preloadImages = (urls: string[]): Promise<(string | void)[]> => {
  const promises = urls.map(url => {
    return new Promise<void | string>((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve();
      img.onerror = () => {
        console.warn(`Failed to preload image, it might not exist: ${url}`);
        resolve(); // Resolve anyway to not block the app loading
      };
    });
  });
  return Promise.all(promises);
};