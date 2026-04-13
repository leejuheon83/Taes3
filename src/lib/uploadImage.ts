// Firebase Storage is no longer used.
// Images are stored as base64 dataURL strings directly in Firestore.
// This file is kept as a placeholder in case it is imported elsewhere.

export async function uploadImageToStorage(_dataUrl: string, _path: string): Promise<string> {
  // No-op: return the dataURL directly
  return _dataUrl;
}

export async function deleteImageFromStorage(_url: string) {
  // No-op: nothing to delete from storage
}
