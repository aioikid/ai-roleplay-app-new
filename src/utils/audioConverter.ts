export const convertWebmToMp3 = async (webmBlob: Blob): Promise<Blob> => {
  // For client-side, we'll send the webm directly to the server
  // The server will handle the conversion using ffmpeg
  return webmBlob;
};

export const createAudioFormData = (audioBlob: Blob, filename: string = 'audio.webm'): FormData => {
  const formData = new FormData();
  formData.append('audio', audioBlob, filename);
  return formData;
};

