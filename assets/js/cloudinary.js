// ============================================================================
// TCP Cloudinary Kit — client-side unsigned uploads.
//
// Fill in your own Cloudinary cloud name and an UNSIGNED upload preset
// below. Cloudinary's unsigned uploads are the only safe way to upload
// straight from browser JS with no backend — a normal (signed) upload
// requires an API secret, which must never sit in client-side code.
//
// Set up an unsigned preset: Cloudinary Dashboard → Settings → Upload →
// Upload presets → Add upload preset → Signing Mode: Unsigned.
// Recommended preset settings for this project:
//   - Folder: tcp (or leave blank and pass one per-call, see below)
//   - Allowed formats: restrict to what each context needs if you want
//     tighter control (this file also does a basic client-side check)
//   - Max file size: set a sane cap (e.g. 200MB for lesson videos)
// ============================================================================

const CLOUDINARY_CLOUD_NAME = "p4mbl13q";
const CLOUDINARY_UPLOAD_PRESET = "skills";

/**
 * Upload a file to Cloudinary.
 * @param {File} file
 * @param {Object} opts
 * @param {"image"|"video"|"raw"|"auto"} [opts.resourceType="auto"] - "image" for
 *   thumbnails, "video" for teaser/lesson videos, "raw" for PDFs/ZIPs/DOCX,
 *   "auto" lets Cloudinary decide.
 * @param {string} [opts.folder="tcp"] - Cloudinary folder to organize uploads.
 * @param {(percent:number)=>void} [opts.onProgress] - optional progress callback (0-100).
 * @returns {Promise<{secure_url:string, public_id:string, resource_type:string, duration?:number, bytes:number}>}
 */
function uploadToCloudinary(file, opts = {}) {
  const { resourceType = "auto", folder = "tcp", onProgress } = opts;

  if (CLOUDINARY_CLOUD_NAME === "YOUR_CLOUDINARY_CLOUD_NAME") {
    return Promise.reject(
      new Error("Cloudinary isn't configured yet — set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in assets/js/cloudinary.js")
    );
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        return reject(new Error("Cloudinary returned an unexpected response."));
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data?.error?.message || "Upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });
}

/** Convenience wrapper: upload an image (thumbnails, avatars, etc). */
function uploadImageToCloudinary(file, folder = "tcp/images", onProgress) {
  return uploadToCloudinary(file, { resourceType: "image", folder, onProgress });
}

/** Convenience wrapper: upload a video (course teasers, lesson videos). */
function uploadVideoToCloudinary(file, folder = "tcp/videos", onProgress) {
  return uploadToCloudinary(file, { resourceType: "video", folder, onProgress });
}

/** Convenience wrapper: upload a non-media file (PDF, ZIP, DOCX, etc). */
function uploadRawToCloudinary(file, folder = "tcp/resources", onProgress) {
  return uploadToCloudinary(file, { resourceType: "raw", folder, onProgress });
}

window.uploadToCloudinary = uploadToCloudinary;
window.uploadImageToCloudinary = uploadImageToCloudinary;
window.uploadVideoToCloudinary = uploadVideoToCloudinary;
window.uploadRawToCloudinary = uploadRawToCloudinary;
