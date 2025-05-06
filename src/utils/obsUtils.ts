
/**
 * Generate a unique OBS URL with timestamp to prevent caching
 * @returns {string} URL with timestamp parameter
 */
export const getOBSUrl = () => {
  const baseUrl = `${window.location.origin}/live-alerts?obs=true`;
  // Use a more specific timestamp with milliseconds for better uniqueness
  return `${baseUrl}&t=${Date.now()}`;
};

/**
 * Copy text to clipboard with a unique URL if it's an OBS URL
 * @param {string} text - Text to copy
 * @param {Function} onSuccess - Callback on successful copy
 */
export const copyToClipboard = (text: string, onSuccess?: () => void) => {
  // Generate fresh URL for OBS links
  if (text.includes('/live-alerts?obs=true')) {
    text = getOBSUrl();
  }
  
  navigator.clipboard.writeText(text)
    .then(() => {
      if (onSuccess) onSuccess();
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
    });
};
